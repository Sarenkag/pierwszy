package com.oest.inspekcje;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** System camera full-file capture; bundled Latin OCR, never uploads an image. */
@CapacitorPlugin(name="OESTKeys")
public class KeysPlugin extends Plugin {
    private File exportFile(String session) throws Exception {if(!session.matches("[0-9a-f-]{36}"))throw new IllegalArgumentException("KEY_EXPORT_SESSION");File dir=new File(getContext().getCacheDir(),"keys-exports");if(!dir.exists()&&!dir.mkdirs())throw new IllegalStateException("KEY_EXPORT_STORAGE");return new File(dir,session+".json");}
    @PluginMethod public void beginExport(PluginCall call){getBridge().execute(()->{try{String session=UUID.randomUUID().toString();File file=exportFile(session);if(!file.createNewFile())throw new IllegalStateException("KEY_EXPORT_STORAGE");JSObject o=new JSObject();o.put("session",session);call.resolve(o);}catch(Exception e){call.reject(e.getMessage());}});}
    @PluginMethod public void appendExport(PluginCall call){getBridge().execute(()->{try{File file=exportFile(call.getString("session",""));String text=call.getString("text","");if(!file.exists()||text.length()>131072||file.length()+text.length()*3L>200L*1024*1024)throw new IllegalArgumentException("KEY_EXPORT_SIZE");try(FileOutputStream stream=new FileOutputStream(file,true)){stream.write(text.getBytes(StandardCharsets.UTF_8));}call.resolve();}catch(Exception e){call.reject(e.getMessage());}});}
    @PluginMethod public void finishExport(PluginCall call){try{File file=exportFile(call.getString("session",""));if(!file.exists()||file.length()==0)throw new IllegalStateException("KEY_EXPORT_EMPTY");Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"OEST-Keys-"+new java.text.SimpleDateFormat("yyyy-MM-dd",java.util.Locale.ROOT).format(new java.util.Date())+".json");startActivityForResult(call,intent,"exportSelected");}catch(Exception e){call.reject(e.getMessage());}}
    @ActivityCallback private void exportSelected(PluginCall call,ActivityResult result){if(call==null)return;getBridge().execute(()->{File file=null;try{file=exportFile(call.getString("session",""));if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null)throw new IllegalStateException("KEY_EXPORT_CANCELLED");try(FileInputStream in=new FileInputStream(file);OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData(),"w")){if(out==null)throw new IllegalStateException("KEY_EXPORT_WRITE");byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);out.flush();}JSObject o=new JSObject();o.put("saved",true);call.resolve(o);}catch(Exception e){call.reject(e.getMessage());}finally{if(file!=null)file.delete();}});}
    @PluginMethod public void cancelExport(PluginCall call){getBridge().execute(()->{try{File file=exportFile(call.getString("session",""));if(file.exists()&&!file.delete())throw new IllegalStateException("KEY_EXPORT_CLEANUP");call.resolve();}catch(Exception e){call.reject(e.getMessage());}});}
    private File directory(){return new File(getContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES),"keys");}
    private File checked(String path) throws Exception {File f=new File(path).getCanonicalFile();if(!f.getParentFile().equals(directory().getCanonicalFile())||!f.getName().startsWith("key-"))throw new IllegalArgumentException("KEY_CAMERA_PATH");return f;}
    @PluginMethod public void capture(PluginCall call){File file=null;try{File dir=directory();if(!dir.exists()&&!dir.mkdirs())throw new IllegalStateException("KEY_CAMERA_STORAGE");file=File.createTempFile("key-",".jpg",dir);Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);intent.setPackage("com.google.android.GoogleCamera");if(intent.resolveActivity(getContext().getPackageManager())==null)intent.setPackage(null);intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);intent.setClipData(ClipData.newRawUri("Key photo",uri));intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);call.getData().put("photoPath",file.getAbsolutePath());startActivityForResult(call,intent,"captured");}catch(Exception e){if(file!=null)file.delete();call.reject("KEY_CAMERA_UNAVAILABLE: "+e.getMessage());}}
    @ActivityCallback private void captured(PluginCall call,ActivityResult result){if(call==null)return;try{File file=checked(call.getString("photoPath",""));if(result.getResultCode()!=Activity.RESULT_OK||!file.exists()||file.length()==0){file.delete();call.reject("KEY_CAMERA_CANCELLED");return;}JSObject out=new JSObject();out.put("path",file.getAbsolutePath());out.put("bytes",file.length());call.resolve(out);}catch(Exception e){call.reject("KEY_CAMERA_FAILED: "+e.getMessage());}}
    @PluginMethod public void release(PluginCall call){try{File file=checked(call.getString("path",""));if(file.exists()&&!file.delete())throw new IllegalStateException("KEY_TEMP_DELETE_FAILED");call.resolve();}catch(Exception e){call.reject(e.getMessage());}}
    @PluginMethod public void recognize(PluginCall call){String encoded=call.getString("base64","");if(encoded.isEmpty()||encoded.length()>4000000){call.reject("KEY_OCR_SIZE");return;}getBridge().execute(()->{Bitmap bitmap=null;TextRecognizer recognizer=null;try{byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);if(bounds.outWidth<1||bounds.outHeight<1||((long)bounds.outWidth)*bounds.outHeight>4000000)throw new IllegalArgumentException("KEY_OCR_SIZE");bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length);if(bitmap==null)throw new IllegalArgumentException("KEY_OCR_IMAGE");recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);final Bitmap image=bitmap;final TextRecognizer reader=recognizer;reader.process(InputImage.fromBitmap(image,0)).addOnSuccessListener(text->{JSObject out=new JSObject();out.put("text",text.getText());call.resolve(out);}).addOnFailureListener(e->call.reject("KEY_OCR_FAILED: "+e.getMessage())).addOnCompleteListener(task->{image.recycle();reader.close();});}catch(Exception e){if(bitmap!=null)bitmap.recycle();if(recognizer!=null)recognizer.close();call.reject("KEY_OCR_FAILED: "+e.getMessage());}});}
}
