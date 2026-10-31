package com.oest.inspekcje;

import android.Manifest;
import android.content.ClipData;
import android.content.Intent;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;

/** User-triggered audio and Android share. No service, background polling or cloud speech fallback. */
@CapacitorPlugin(name="HandoverTools", permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public class HandoverPlugin extends Plugin {
    private volatile boolean recording=false;
    private AudioRecord recorder;
    private Thread audioThread;
    private ByteArrayOutputStream pcm;
    private final Handler main=new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private PluginCall speechCall;
    private ParcelFileDescriptor speechInput;
    private static final int RATE=16000, MAX_PCM=RATE*2*120;

    @PluginMethod public void startAudio(PluginCall call) {
        if(recording || recorder!=null){call.reject("AUDIO_BUSY");return;}
        if(getPermissionState("microphone")!=PermissionState.GRANTED){requestPermissionForAlias("microphone",call,"audioPermission");return;}
        beginAudio(call);
    }
    @PermissionCallback private void audioPermission(PluginCall call){if(getPermissionState("microphone")!=PermissionState.GRANTED){call.reject("MICROPHONE_DENIED");return;}beginAudio(call);}
    private synchronized void beginAudio(PluginCall call){
        if(recorder!=null){call.reject("AUDIO_BUSY");return;}
        try{
            int buffer=Math.max(4096,AudioRecord.getMinBufferSize(RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT));
            recorder=new AudioRecord(MediaRecorder.AudioSource.MIC,RATE,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,buffer);
            if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new IllegalStateException("AUDIO_UNAVAILABLE");
            pcm=new ByteArrayOutputStream();recorder.startRecording();recording=true;
            final AudioRecord source=recorder;
            audioThread=new Thread(()->{byte[] chunk=new byte[4096];try{while(recording&&pcm.size()<MAX_PCM){int n=source.read(chunk,0,Math.min(chunk.length,MAX_PCM-pcm.size()));if(n>0)pcm.write(chunk,0,n);else break;}}finally{recording=false;try{source.stop();}catch(Exception ignored){}}},"oest-voice");
            audioThread.start();call.resolve();
        }catch(Exception e){cleanupAudio();call.reject("AUDIO_UNAVAILABLE");}
    }
    @PluginMethod public void stopAudio(PluginCall call){
        if(recorder==null){call.reject("AUDIO_NOT_RECORDING");return;}
        new Thread(()->{try{recording=false;try{recorder.stop();}catch(Exception ignored){}if(audioThread!=null)audioThread.join(3000);if(audioThread!=null&&audioThread.isAlive())throw new IllegalStateException();byte[] raw=pcm.toByteArray();if(raw.length==0)throw new IllegalStateException();byte[] wav=wav(raw);cleanupAudio();JSObject r=new JSObject();r.put("data",Base64.encodeToString(wav,Base64.NO_WRAP));call.resolve(r);}catch(Exception e){cleanupAudio();call.reject("AUDIO_SAVE_FAILED");}},"oest-stop-voice").start();
    }
    private synchronized void cleanupAudio(){recording=false;if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}try{recorder.release();}catch(Exception ignored){}recorder=null;}}
    private static byte[] wav(byte[] raw){ByteBuffer b=ByteBuffer.allocate(44+raw.length).order(ByteOrder.LITTLE_ENDIAN);b.put(new byte[]{'R','I','F','F'}).putInt(36+raw.length).put(new byte[]{'W','A','V','E','f','m','t',' '}).putInt(16).putShort((short)1).putShort((short)1).putInt(RATE).putInt(RATE*2).putShort((short)2).putShort((short)16).put(new byte[]{'d','a','t','a'}).putInt(raw.length).put(raw);return b.array();}
    @PluginMethod public void transcribe(PluginCall call){
        if(Build.VERSION.SDK_INT<33){call.reject("RECORDED_SPEECH_REQUIRES_ANDROID_13");return;}
        if(getPermissionState("microphone")!=PermissionState.GRANTED){call.reject("MICROPHONE_DENIED");return;}
        String encoded=call.getString("data","");if(encoded.length()>MAX_PCM*2){call.reject("AUDIO_SIZE");return;}
        byte[] wav;try{wav=Base64.decode(encoded,Base64.DEFAULT);if(wav.length<44||wav[0]!='R'||wav[8]!='W')throw new IllegalArgumentException();}catch(Exception e){call.reject("AUDIO_FORMAT");return;}
        main.post(()->{
            if(speechCall!=null){call.reject("SPEECH_BUSY");return;}
            if(!SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())){call.reject("ON_DEVICE_POLISH_SPEECH_UNAVAILABLE");return;}
            try{
                speechCall=call;ParcelFileDescriptor[] pipe=ParcelFileDescriptor.createPipe();speechInput=pipe[0];
                recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener(){
                    public void onReadyForSpeech(Bundle b){}public void onBeginningOfSpeech(){}public void onRmsChanged(float r){}public void onBufferReceived(byte[] b){}public void onEndOfSpeech(){}public void onPartialResults(Bundle b){}public void onEvent(int t,Bundle b){}
                    public void onError(int error){finishSpeech(null,"SPEECH_ERROR_"+error);}
                    public void onResults(Bundle b){ArrayList<String> results=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);finishSpeech(results!=null&&!results.isEmpty()?results.get(0):null,"SPEECH_EMPTY");}
                });
                Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"pl-PL");intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE,speechInput);intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT,1);intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING,AudioFormat.ENCODING_PCM_16BIT);intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE,RATE);
                recognizer.startListening(intent);
                new Thread(()->{try(ParcelFileDescriptor.AutoCloseOutputStream out=new ParcelFileDescriptor.AutoCloseOutputStream(pipe[1])){out.write(wav,44,wav.length-44);}catch(Exception ignored){}},"oest-speech-input").start();
                main.postDelayed(()->{if(speechCall==call)finishSpeech(null,"SPEECH_TIMEOUT");},45000);
            }catch(Exception e){finishSpeech(null,"SPEECH_UNAVAILABLE");}
        });
    }
    private void finishSpeech(String text,String error){PluginCall c=speechCall;speechCall=null;if(recognizer!=null){recognizer.destroy();recognizer=null;}try{if(speechInput!=null)speechInput.close();}catch(Exception ignored){}speechInput=null;if(c!=null){if(text==null)c.reject(error);else{JSObject r=new JSObject();r.put("text",text);c.resolve(r);}}}
    @PluginMethod public void share(PluginCall call){
        String body=call.getString("body",""),subject=call.getString("subject","Handover");JSArray recipients=call.getArray("recipients",new JSArray()),photos=call.getArray("photos",new JSArray());
        if(body.length()>150000||photos.length()>30||recipients.length()==0||recipients.length()>20){call.reject("SHARE_INPUT");return;}
        try{
            String[] addresses=new String[recipients.length()];for(int i=0;i<addresses.length;i++){addresses[i]=recipients.getString(i);if(!addresses[i].matches("[^\\s@,;<>]+@[^\\s@,;<>]+\\.[^\\s@,;<>]+"))throw new IllegalArgumentException();}
            File dir=new File(getContext().getCacheDir(),"handover-share");if(!dir.exists()&&!dir.mkdirs())throw new IllegalStateException();
            // Only this plugin's old temporary share copies are cleaned; persistent IndexedDB evidence is untouched.
            File[] old=dir.listFiles();if(old!=null)for(File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
            ArrayList<Uri> uris=new ArrayList<>();long total=0;String batch=java.util.UUID.randomUUID().toString();
            for(int i=0;i<photos.length();i++){String encoded=photos.getJSONObject(i).getString("data");if(encoded.length()>15*1024*1024)throw new IllegalArgumentException();byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);total+=bytes.length;if(total>35*1024*1024||bytes.length<3||(bytes[0]&255)!=255||(bytes[1]&255)!=216)throw new IllegalArgumentException();File f=new File(dir,batch+"-Photo-"+(i+1)+".jpg");try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}uris.add(FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",f));}
            Intent send=new Intent(uris.size()>1?Intent.ACTION_SEND_MULTIPLE:Intent.ACTION_SEND);send.setType(uris.isEmpty()?"text/plain":"image/jpeg");send.putExtra(Intent.EXTRA_EMAIL,addresses);send.putExtra(Intent.EXTRA_SUBJECT,subject);send.putExtra(Intent.EXTRA_TEXT,body);
            if(!uris.isEmpty()){if(uris.size()>1)send.putParcelableArrayListExtra(Intent.EXTRA_STREAM,uris);else send.putExtra(Intent.EXTRA_STREAM,uris.get(0));ClipData clips=ClipData.newUri(getContext().getContentResolver(),"Handover photos",uris.get(0));for(int i=1;i<uris.size();i++)clips.addItem(new ClipData.Item(uris.get(i)));send.setClipData(clips);send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);}
            getActivity().runOnUiThread(()->{try{getActivity().startActivity(Intent.createChooser(send,"Handover"));JSObject r=new JSObject();r.put("status","shared");call.resolve(r);}catch(Exception e){call.reject("SHARE_UNAVAILABLE");}});
        }catch(Exception e){call.reject("SHARE_PREPARATION_FAILED");}
    }
    @Override protected void handleOnDestroy(){cleanupAudio();main.post(()->finishSpeech(null,"APP_CLOSED"));super.handleOnDestroy();}
    @Override protected void handleOnPause(){recording=false;if(recorder!=null)try{recorder.stop();}catch(Exception ignored){}super.handleOnPause();}
}
