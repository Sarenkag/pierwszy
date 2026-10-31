package com.oest.inspekcje;

import android.Manifest;
import android.content.ContentProviderOperation;
import android.content.ContentProviderResult;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.provider.CalendarContract;
import android.provider.CalendarContract.Calendars;
import android.provider.CalendarContract.Events;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** Calendar Provider only. Never creates a Google calendar or reads the user's shift events. */
@CapacitorPlugin(name="OESTCalendar",permissions={@Permission(alias="calendar",strings={Manifest.permission.READ_CALENDAR,Manifest.permission.WRITE_CALENDAR})})
public class CalendarPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private interface Work { JSObject run() throws Exception; }
    private void run(PluginCall call,Work work){worker.execute(()->{try{if(getPermissionState("calendar")!=PermissionState.GRANTED)throw new IllegalStateException("CALENDAR_PERMISSION_REQUIRED");call.resolve(work.run());}catch(Exception e){call.reject(e.getMessage()==null?"CALENDAR_FAILED":e.getMessage());}});}
    private JSObject calendar(long id) throws Exception {
        String[] columns={Calendars._ID,Calendars.ACCOUNT_NAME,Calendars.ACCOUNT_TYPE,Calendars.CALENDAR_DISPLAY_NAME,Calendars.CALENDAR_ACCESS_LEVEL};
        try(Cursor c=getContext().getContentResolver().query(Calendars.CONTENT_URI,columns,Calendars._ID+"=?",new String[]{Long.toString(id)},null)){
            if(c==null||!c.moveToFirst()||!"com.google".equals(c.getString(2))||!"OEST PPM".equals(c.getString(3))||c.getInt(4)<Calendars.CAL_ACCESS_OWNER)throw new IllegalStateException("OEST_CALENDAR_NOT_OWNED_OR_MISSING");
            JSObject o=new JSObject();o.put("id",Long.toString(id));o.put("account",c.getString(1));o.put("name",c.getString(3));return o;
        }
    }
    private String scope(PluginCall call) throws Exception {String s=call.getString("scope","");if(s.isEmpty()||s.length()>300)throw new IllegalArgumentException("CALENDAR_SCOPE");byte[] hash=MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:hash)b.append(String.format(Locale.ROOT,"%02x",x));return b.toString();}
    private long bound(PluginCall call,String scope) throws Exception {long id=Long.parseLong(call.getString("calendarId",""));JSObject cal=calendar(id);String value=getContext().getSharedPreferences("oest-calendar",0).getString(scope,"");if(!value.equals(id+"|"+cal.getString("account")))throw new IllegalStateException("CALENDAR_RESELECT_REQUIRED");return id;}
    @PluginMethod public void listCalendars(PluginCall call){if(getPermissionState("calendar")!=PermissionState.GRANTED){requestPermissionForAlias("calendar",call,"calendarPermission");return;}list(call);}
    @PermissionCallback private void calendarPermission(PluginCall call){if(getPermissionState("calendar")!=PermissionState.GRANTED){call.reject("CALENDAR_PERMISSION_DENIED");return;}list(call);}
    private void list(PluginCall call){run(call,()->{JSArray rows=new JSArray();try(Cursor c=getContext().getContentResolver().query(Calendars.CONTENT_URI,new String[]{Calendars._ID},Calendars.ACCOUNT_TYPE+"=? AND "+Calendars.CALENDAR_DISPLAY_NAME+"=? AND "+Calendars.CALENDAR_ACCESS_LEVEL+">=?",new String[]{"com.google","OEST PPM",Integer.toString(Calendars.CAL_ACCESS_OWNER)},null)){if(c==null)throw new IllegalStateException("CALENDAR_READ_FAILED");while(c.moveToNext())rows.put(calendar(c.getLong(0)));}JSObject o=new JSObject();o.put("calendars",rows);return o;});}
    @PluginMethod public void bindCalendar(PluginCall call){run(call,()->{if(!Boolean.TRUE.equals(call.getBoolean("privateConfirmed",false)))throw new IllegalStateException("CALENDAR_PRIVATE_CONFIRMATION");String scope=scope(call);long id=Long.parseLong(call.getString("calendarId",""));JSObject cal=calendar(id);if(!getContext().getSharedPreferences("oest-calendar",0).edit().putString(scope,id+"|"+cal.getString("account")).commit())throw new IllegalStateException("CALENDAR_BIND_SAVE_FAILED");return cal;});}
    private String prefix(String scope){return "\n\n[OEST_PPM_V1:"+scope+":";}
    private JSONObject metadata(String description,String scope) throws Exception {int start=description.lastIndexOf(prefix(scope));if(start<0||!description.endsWith("]"))return null;String encoded=description.substring(start+prefix(scope).length(),description.length()-1);return new JSONObject(new String(Base64.decode(encoded,Base64.URL_SAFE|Base64.NO_WRAP),StandardCharsets.UTF_8));}
    private String publicDescription(String d,String scope){int i=d.lastIndexOf(prefix(scope));return i<0?d:d.substring(0,i);}
    private long day(String date) throws Exception {if(!date.matches("\\d{4}-\\d{2}-\\d{2}"))throw new IllegalArgumentException("CALENDAR_DATE");SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone("UTC"));f.setLenient(false);Date parsed=f.parse(date);if(parsed==null||!f.format(parsed).equals(date))throw new IllegalArgumentException("CALENDAR_DATE");return parsed.getTime();}
    private String date(long time){SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone("UTC"));return f.format(new Date(time));}
    private JSArray owned(long calendarId,String scope) throws Exception {JSArray rows=new JSArray();String[] cols={Events._ID,Events.TITLE,Events.DESCRIPTION,Events.DTSTART,Events.EVENT_COLOR};try(Cursor c=getContext().getContentResolver().query(Events.CONTENT_URI,cols,Events.CALENDAR_ID+"=? AND "+Events.DELETED+"=0",new String[]{Long.toString(calendarId)},Events.DTSTART+","+Events._ID)){if(c==null)throw new IllegalStateException("CALENDAR_READ_FAILED");while(c.moveToNext()){String description=c.getString(2);if(description==null)continue;JSONObject meta;try{meta=metadata(description,scope);}catch(Exception invalid){continue;}if(meta==null)continue;JSObject e=JSObject.fromJSONObject(meta);e.put("eventId",Long.toString(c.getLong(0)));e.put("title",c.getString(1));e.put("description",publicDescription(description,scope));e.put("date",date(c.getLong(3)));e.put("color",String.format(Locale.ROOT,"#%06x",c.getInt(4)&0xffffff));e.put("expectedDescription",description);rows.put(e);}}return rows;}
    @PluginMethod public void getEvents(PluginCall call){run(call,()->{String scope=scope(call);long id=bound(call,scope);JSObject o=new JSObject();o.put("events",owned(id,scope));return o;});}
    private ContentValues values(JSONObject event,long calendarId,String scope) throws Exception {String key=event.getString("key"),task=event.getString("taskId"),kind=event.getString("kind"),due=event.getString("sourceDue"),display=event.getString("date"),title=event.getString("title"),description=event.getString("description"),color=event.getString("color");boolean completed=event.getBoolean("completed");day(due);long start=day(display);if((!kind.equals("ppm")&&!kind.equals("shift"))||!task.matches("[\\w.-]{1,120}")||!key.equals((kind.equals("ppm")?"ppm:"+task+":":kind.equals("shift")?"shift:":"INVALID:")+due)||title.length()>1000||description.length()>12000||!color.matches("#[0-9a-fA-F]{6}"))throw new IllegalArgumentException("CALENDAR_EVENT_INVALID");JSONObject meta=new JSONObject();meta.put("key",key);meta.put("taskId",task);meta.put("kind",kind);meta.put("sourceDue",due);meta.put("completed",completed);String marker=Base64.encodeToString(meta.toString().getBytes(StandardCharsets.UTF_8),Base64.URL_SAFE|Base64.NO_WRAP);ContentValues v=new ContentValues();v.put(Events.CALENDAR_ID,calendarId);v.put(Events.TITLE,title);v.put(Events.DESCRIPTION,description+prefix(scope)+marker+"]");v.put(Events.DTSTART,start);v.put(Events.DTEND,start+86400000L);v.put(Events.ALL_DAY,1);v.put(Events.EVENT_TIMEZONE,"UTC");v.put(Events.EVENT_COLOR,(int)(0xff000000L|Long.parseLong(color.substring(1),16)));v.put(Events.AVAILABILITY,Events.AVAILABILITY_FREE);return v;}
    @PluginMethod public void applyChanges(PluginCall call){run(call,()->{String scope=scope(call);long id=bound(call,scope);JSArray requested=call.getArray("operations",new JSArray());if(requested.length()>5000)throw new IllegalArgumentException("CALENDAR_BATCH_LIMIT");JSArray rows=owned(id,scope);java.util.Map<String,JSONObject> existing=new java.util.HashMap<>();for(int i=0;i<rows.length();i++)existing.put(rows.getJSONObject(i).getString("eventId"),rows.getJSONObject(i));ArrayList<ContentProviderOperation> batch=new ArrayList<>();HashSet<String> touched=new HashSet<>(),keys=new HashSet<>();for(int i=0;i<requested.length();i++){JSONObject op=requested.getJSONObject(i);String action=op.getString("op");if(action.equals("insert")){JSONObject event=op.getJSONObject("event");if(!keys.add(event.getString("key")))throw new IllegalArgumentException("CALENDAR_DUPLICATE_KEY");batch.add(ContentProviderOperation.newInsert(Events.CONTENT_URI).withValues(values(event,id,scope)).build());}else{String eventId=op.getString("eventId");JSONObject old=existing.get(eventId);if(old==null||!old.getString("key").equals(op.getString("expectedKey"))||!touched.add(eventId))throw new IllegalStateException("CALENDAR_EVENT_CHANGED");ContentProviderOperation.Builder b;if(action.equals("update")){JSONObject event=op.getJSONObject("event");if(!keys.add(event.getString("key")))throw new IllegalArgumentException("CALENDAR_DUPLICATE_KEY");b=ContentProviderOperation.newUpdate(Events.CONTENT_URI).withValues(values(event,id,scope));}else if(action.equals("delete"))b=ContentProviderOperation.newDelete(Events.CONTENT_URI);else throw new IllegalArgumentException("CALENDAR_OPERATION");batch.add(b.withSelection(Events._ID+"=? AND "+Events.CALENDAR_ID+"=? AND "+Events.DESCRIPTION+"=?",new String[]{eventId,Long.toString(id),old.getString("expectedDescription")}).withExpectedCount(1).build());}}
        if(!batch.isEmpty()){ContentProviderResult[] results=getContext().getContentResolver().applyBatch(CalendarContract.AUTHORITY,batch);if(results.length!=batch.size())throw new IllegalStateException("CALENDAR_WRITE_UNCONFIRMED");}JSObject o=new JSObject();o.put("applied",batch.size());return o;});}
    @PluginMethod public void removeOwnedEvents(PluginCall call){run(call,()->{String scope=scope(call);long id=bound(call,scope);JSArray rows=owned(id,scope);ArrayList<ContentProviderOperation> batch=new ArrayList<>();for(int i=0;i<rows.length();i++){JSONObject row=rows.getJSONObject(i);batch.add(ContentProviderOperation.newDelete(Events.CONTENT_URI).withSelection(Events._ID+"=? AND "+Events.CALENDAR_ID+"=? AND "+Events.DESCRIPTION+"=?",new String[]{row.getString("eventId"),Long.toString(id),row.getString("expectedDescription")}).withExpectedCount(1).build());}if(!batch.isEmpty())getContext().getContentResolver().applyBatch(CalendarContract.AUTHORITY,batch);JSObject o=new JSObject();o.put("removed",batch.size());return o;});}
    @PluginMethod public void openCalendar(PluginCall call){getActivity().runOnUiThread(()->{try{Intent i=new Intent(Intent.ACTION_VIEW,ContentUris.withAppendedId(CalendarContract.CONTENT_URI.buildUpon().appendPath("time").build(),System.currentTimeMillis()));getActivity().startActivity(i);call.resolve();}catch(Exception e){call.reject("CALENDAR_APP_UNAVAILABLE");}});}
    @Override protected void handleOnDestroy(){worker.shutdown();super.handleOnDestroy();}
}
