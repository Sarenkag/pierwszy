package com.oest.inspekcje

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.runBlocking
import java.io.File
import java.util.concurrent.Executors

/**
 * Model tekstowy na telefonie (LiteRT-LM, Gemma 4 E2B/E4B). Jeden plik na telefonie (Grzegorz 25/11/2026): najpierw folder
 * „Modele” w pamięci telefonu (czytany na miejscu, bez kopii; wymaga zgody „Dostęp do wszystkich plików”), a gdy go tam nie ma –
 * plik pobrany raz przez Wi-Fi (DownloadManager) do katalogu apki. Potem wszystko offline. Jedno zadanie naraz,
 * silnik zwalniany po 3 min bezczynności.
 */
@CapacitorPlugin(name = "OESTModel")
class ModelPlugin : Plugin() {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private var engine: Engine? = null
    private var engineFile: String = ""
    /** Czat z Gemmą (Grzegorz 27/11/2026): jedna trwała rozmowa biblioteki – każda wiadomość to kolejna tura (wzór Google LiteRT-LM). */
    private var chat: Conversation? = null
    private var chatKey: String = ""
    @Volatile private var destroyed = false
    private val idle = Runnable { if (!destroyed) try { worker.execute { closeEngine() } } catch (_: Throwable) {} }

    private fun dir(): File = File(context.getExternalFilesDir(null) ?: context.filesDir, "models").also { it.mkdirs() }
    /** Wspólny folder modeli: /sdcard/Modele (inne apki też mogą z niego czytać). */
    private fun shared(name: String): File = File(Environment.getExternalStorageDirectory(), "Modele/$name")
    private fun access(): Boolean = Build.VERSION.SDK_INT < 30 || Environment.isExternalStorageManager()
    private fun sharedOk(name: String): Boolean = access() && shared(name).let { it.isFile && it.canRead() && it.length() > 0 }
    /** Plik, z którego czytamy: folder Modele, a gdy go tam nie ma – kopia pobrana przez apkę. */
    private fun fileFor(name: String): File = if (sharedOk(name)) shared(name) else File(dir(), name)
    private fun safeName(n: String): String { require(Regex("^[A-Za-z0-9._-]{1,80}\\.litertlm$").matches(n)) { "MODEL_NAME" }; return n }
    private fun prefs() = context.getSharedPreferences("oest-model", Context.MODE_PRIVATE)
    private fun dm() = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

    @PluginMethod fun status(call: PluginCall) {
        try {
            val name = safeName(call.getString("name", "")!!)
            val isShared = sharedOk(name)
            val file = fileFor(name)
            val out = JSObject()
            out.put("supported", Build.VERSION.SDK_INT >= 31)
            out.put("access", access())
            out.put("shared", isShared)
            out.put("ready", file.exists() && file.length() > 0 && (isShared || prefs().getLong("dl:$name", -1L) == -1L))
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
        if (Build.VERSION.SDK_INT < 31) { call.reject("MODEL_ANDROID_TOO_OLD"); return }
        try {
            val name = safeName(call.getString("name", "")!!)
            val url = call.getString("url", "")!!
            require(url.startsWith("https://huggingface.co/litert-community/")) { "MODEL_URL" }
            if (prefs().getLong("dl:$name", -1L) >= 0) { call.resolve(); return }
            if (sharedOk(name)) { call.resolve(); return } // jest już w folderze Modele – druga kopia niepotrzebna
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
                val file = File(dir(), name) // usuwa tylko kopię apki; pliku z folderu Modele apka nie kasuje
                if (engineFile == file.path) closeEngine()
                file.delete(); call.resolve()
            }
        } catch (e: Throwable) { call.reject("MODEL_REMOVE: " + e.message) }
    }

    /** Otwiera ustawienia Androida „Dostęp do wszystkich plików” dla OEST (odczyt folderu Modele). */
    @PluginMethod fun allowFiles(call: PluginCall) {
        if (Build.VERSION.SDK_INT < 30 || access()) { call.resolve(); return }
        try {
            val i = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + context.packageName))
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { context.startActivity(i) } catch (_: Throwable) {
                context.startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            call.resolve()
        } catch (e: Throwable) { call.reject("MODEL_ACCESS: " + e.message) }
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
                val file = fileFor(name)
                if (!file.exists() || (file.parentFile == dir() && stillDownloading(name))) throw IllegalStateException("MODEL_NOT_DOWNLOADED")
                val eng = load(file)
                closeChat() // silnik trzyma jedną rozmowę naraz; czat wróci z historii przy następnej wiadomości
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

    /** {name, system, message, history:[{role:'user'|'model', text}]} → {text}. history wczytywana tylko przy zakładaniu rozmowy (start apki, po pracy agenta, po zwolnieniu silnika). */
    @PluginMethod fun chat(call: PluginCall) {
        val name: String; val system = call.getString("system", "")!!; val message = call.getString("message", "")!!
        try { name = safeName(call.getString("name", "")!!) } catch (e: Throwable) { call.reject("MODEL_NAME"); return }
        if (Build.VERSION.SDK_INT < 31) { call.reject("MODEL_ANDROID_TOO_OLD"); return }
        if (message.isBlank() || message.length > 20000 || system.length > 8000) { call.reject("MODEL_INPUT"); return }
        val history = mutableListOf<Message>()
        try {
            val arr = call.getArray("history")
            if (arr != null) for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i); val t = o.optString("text", "")
                if (t.isNotBlank()) history.add(if (o.optString("role") == "model") Message.model(t) else Message.user(t))
            }
        } catch (e: Throwable) { call.reject("MODEL_INPUT"); return }
        val temperature = call.getDouble("temperature") ?: 0.2
        main.removeCallbacks(idle)
        worker.execute {
            try {
                val file = fileFor(name)
                if (!file.exists() || (file.parentFile == dir() && stillDownloading(name))) throw IllegalStateException("MODEL_NOT_DOWNLOADED")
                val eng = load(file)
                val key = file.path + "\n" + system
                val conv = chat?.takeIf { chatKey == key } ?: run {
                    closeChat()
                    eng.createConversation(ConversationConfig(
                        systemInstruction = Contents.of(system),
                        initialMessages = history,
                        samplerConfig = SamplerConfig(topK = 20, topP = 0.9, temperature = temperature),
                    )).also { chat = it; chatKey = key }
                }
                val text = runBlocking { conv.sendMessage(message) }.toString()
                val out = JSObject(); out.put("text", text.trim()); call.resolve(out)
            } catch (e: Throwable) {
                closeChat()
                call.reject("MODEL_FAILED: " + (e.message ?: e.javaClass.simpleName))
            } finally {
                if (!destroyed) main.postDelayed(idle, 180_000)
            }
        }
    }

    /** „Nowa rozmowa”: zamyka rozmowę czatu w bibliotece. */
    @PluginMethod fun chatReset(call: PluginCall) { worker.execute { closeChat(); call.resolve() } }

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

    private fun closeChat() { try { chat?.close() } catch (_: Throwable) {} ; chat = null; chatKey = "" }
    private fun closeEngine() { closeChat(); try { engine?.close() } catch (_: Throwable) {} ; engine = null; engineFile = "" }

    override fun handleOnDestroy() { destroyed = true; main.removeCallbacks(idle); worker.execute { closeEngine() }; worker.shutdown(); super.handleOnDestroy() }
}
