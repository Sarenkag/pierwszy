package com.oest.inspekcje

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.runBlocking
import java.io.File
import java.util.concurrent.Executors

/**
 * Model tekstowy na telefonie (LiteRT-LM, Gemma 4 E2B/E4B). Plik modelu pobierany raz przez Wi-Fi (DownloadManager)
 * do katalogu apki; potem wszystko offline. Jedno zadanie naraz, silnik zwalniany po 3 min bezczynności.
 */
@CapacitorPlugin(name = "OESTModel")
class ModelPlugin : Plugin() {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private var engine: Engine? = null
    private var engineFile: String = ""
    @Volatile private var destroyed = false
    private val idle = Runnable { if (!destroyed) try { worker.execute { closeEngine() } } catch (_: Throwable) {} }

    private fun dir(): File = File(context.getExternalFilesDir(null) ?: context.filesDir, "models").also { it.mkdirs() }
    private fun safeName(n: String): String { require(Regex("^[A-Za-z0-9._-]{1,80}\\.litertlm$").matches(n)) { "MODEL_NAME" }; return n }
    private fun prefs() = context.getSharedPreferences("oest-model", Context.MODE_PRIVATE)
    private fun dm() = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

    @PluginMethod fun status(call: PluginCall) {
        try {
            val name = safeName(call.getString("name", "")!!)
            val file = File(dir(), name)
            val out = JSObject()
            out.put("supported", Build.VERSION.SDK_INT >= 31)
            out.put("ready", file.exists() && file.length() > 0 && prefs().getLong("dl:$name", -1L) == -1L)
            out.put("bytes", if (file.exists()) file.length() else 0L)
            out.put("loaded", engine != null && engineFile == file.path)
            val id = prefs().getLong("dl:$name", -1L)
            if (id >= 0) {
                dm().query(DownloadManager.Query().setFilterById(id)).use { c ->
                    if (c.moveToFirst()) {
                        val st = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                        val got = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                        val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                        when (st) {
                            DownloadManager.STATUS_SUCCESSFUL -> { prefs().edit().remove("dl:$name").apply(); out.put("ready", file.exists() && file.length() > 0) }
                            DownloadManager.STATUS_FAILED -> { prefs().edit().remove("dl:$name").apply(); file.delete(); out.put("error", "DOWNLOAD_FAILED_" + c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))) }
                            else -> { out.put("downloading", true); out.put("paused", st == DownloadManager.STATUS_PAUSED || st == DownloadManager.STATUS_PENDING); out.put("got", got); out.put("total", total) }
                        }
                    } else prefs().edit().remove("dl:$name").apply()
                }
            }
            call.resolve(out)
        } catch (e: Throwable) { call.reject("MODEL_STATUS: " + e.message) }
    }

    @PluginMethod fun download(call: PluginCall) {
        try {
            val name = safeName(call.getString("name", "")!!)
            val url = call.getString("url", "")!!
            require(url.startsWith("https://huggingface.co/litert-community/")) { "MODEL_URL" }
            if (prefs().getLong("dl:$name", -1L) >= 0) { call.resolve(); return }
            val file = File(dir(), name); file.delete()
            val req = DownloadManager.Request(Uri.parse(url))
                .setTitle("OEST: model tekstowy")
                .setDescription(name)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI)
                .setAllowedOverMetered(false)
                .setDestinationUri(Uri.fromFile(file))
            prefs().edit().putLong("dl:$name", dm().enqueue(req)).apply()
            call.resolve()
        } catch (e: Throwable) { call.reject("MODEL_DOWNLOAD: " + e.message) }
    }

    @PluginMethod fun remove(call: PluginCall) {
        try {
            val name = safeName(call.getString("name", "")!!)
            val id = prefs().getLong("dl:$name", -1L)
            if (id >= 0) { dm().remove(id); prefs().edit().remove("dl:$name").apply() }
            worker.execute {
                val file = File(dir(), name)
                if (engineFile == file.path) closeEngine()
                file.delete(); call.resolve()
            }
        } catch (e: Throwable) { call.reject("MODEL_REMOVE: " + e.message) }
    }

    /** {name, system, prompt, temperature?} → {text} */
    @PluginMethod fun generate(call: PluginCall) {
        val name: String; val system = call.getString("system", "")!!; val prompt = call.getString("prompt", "")!!
        try { name = safeName(call.getString("name", "")!!) } catch (e: Throwable) { call.reject("MODEL_NAME"); return }
        if (Build.VERSION.SDK_INT < 31) { call.reject("MODEL_ANDROID_TOO_OLD"); return }
        if (prompt.isBlank() || prompt.length > 20000 || system.length > 8000) { call.reject("MODEL_INPUT"); return }
        val temperature = call.getDouble("temperature") ?: 0.2
        main.removeCallbacks(idle)
        worker.execute {
            try {
                val file = File(dir(), name)
                if (!file.exists() || stillDownloading(name)) throw IllegalStateException("MODEL_NOT_DOWNLOADED")
                val eng = load(file)
                val cfg = ConversationConfig(
                    systemInstruction = Contents.of(system),
                    samplerConfig = SamplerConfig(topK = 20, topP = 0.9, temperature = temperature),
                )
                val text = eng.createConversation(cfg).use { conv -> runBlocking { conv.sendMessage(prompt) }.toString() }
                val out = JSObject(); out.put("text", text.trim()); call.resolve(out)
            } catch (e: Throwable) {
                call.reject("MODEL_FAILED: " + (e.message ?: e.javaClass.simpleName))
            } finally {
                if (!destroyed) main.postDelayed(idle, 180_000)
            }
        }
    }

    @PluginMethod fun unload(call: PluginCall) { worker.execute { closeEngine(); call.resolve() } }

    private fun load(file: File): Engine {
        engine?.let { if (engineFile == file.path) return it }
        closeEngine()
        val e = Engine(EngineConfig(modelPath = file.path, backend = Backend.CPU(), cacheDir = context.cacheDir.path))
        runBlocking { e.initialize() }
        engine = e; engineFile = file.path
        return e
    }

    /** Pobieranie w toku? Zakończone pobieranie czyści znacznik. */
    private fun stillDownloading(name: String): Boolean {
        val id = prefs().getLong("dl:$name", -1L); if (id < 0) return false
        dm().query(DownloadManager.Query().setFilterById(id)).use { c ->
            if (c.moveToFirst() && c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) != DownloadManager.STATUS_SUCCESSFUL) return true
        }
        prefs().edit().remove("dl:$name").apply(); return false
    }

    private fun closeEngine() { try { engine?.close() } catch (_: Throwable) {} ; engine = null; engineFile = "" }

    override fun handleOnDestroy() { destroyed = true; main.removeCallbacks(idle); worker.execute { closeEngine() }; worker.shutdown(); super.handleOnDestroy() }
}
