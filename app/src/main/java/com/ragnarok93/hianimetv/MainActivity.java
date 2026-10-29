package com.ragnarok93.hianimetv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.graphics.Color;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String HOME = "https://hianime.ms/";
    private WebView web;
    private ProgressBar progress;
    private TextView error;
    private View videoView;
    private WebChromeClient.CustomViewCallback videoCallback;
    private volatile boolean webHasEditableFocus = false;

    public final class TvNavigationBridge {
        @JavascriptInterface
        public void setEditable(boolean editable) {
            webHasEditableFocus = editable;
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new TvNavigationBridge(), "HiAnimeTvBridge");
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), android.view.Gravity.TOP));
        error = new TextView(this);
        error.setTextColor(Color.WHITE);
        error.setTextSize(18);
        error.setGravity(android.view.Gravity.CENTER);
        error.setBackgroundColor(Color.BLACK);
        error.setVisibility(View.GONE);
        error.setFocusable(true);
        error.setOnClickListener(v -> web.reload());
        root.addView(error, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView v, int value) {
                progress.setProgress(value);
                progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE);
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (videoView != null) { callback.onCustomViewHidden(); return; }
                videoView = view;
                videoCallback = callback;
                // The fullscreen player is a separate custom view; the hidden WebView
                // no longer receives DPAD/SELECT focus while this view is active.
                view.setFocusable(true);
                view.setFocusableInTouchMode(true);
                ((FrameLayout) getWindow().getDecorView()).addView(view, new FrameLayout.LayoutParams(-1, -1));
                view.requestFocus();
                web.setVisibility(View.GONE);
                progress.setVisibility(View.GONE);
                immersive();
            }
            @Override public void onHideCustomView() { hideVideo(false); }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return route(request.getUrl().toString());
            }
            @SuppressWarnings("deprecation")
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return route(url); }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                error.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView v, String url) {
                injectTvNavigation();
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest request, android.webkit.WebResourceError e) {
                if (request.isForMainFrame()) showError();
            }
            @SuppressWarnings("deprecation")
            @Override public void onReceivedError(WebView v, int code, String description, String url) {
                if (android.os.Build.VERSION.SDK_INT < 23) showError();
            }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler handler, SslError e) {
                handler.cancel();
                Toast.makeText(MainActivity.this, "Secure connection failed", Toast.LENGTH_SHORT).show();
            }
        });
        if (state == null) web.loadUrl(HOME); else web.restoreState(state);
        web.requestFocus();
    }

    private void injectTvNavigation() {
        if (web == null) return;
        try (InputStream input = getAssets().open("tv-navigation.js");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            String script = new String(output.toByteArray(), StandardCharsets.UTF_8);
            web.evaluateJavascript(script, null);
        } catch (Exception ignored) {
            // Keep the website usable if the optional TV navigation helper cannot load.
        }
    }

    private boolean route(String raw) {
        Uri uri = Uri.parse(raw);
        String scheme = uri.getScheme();
        if (scheme == null || "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)
                || "about".equalsIgnoreCase(scheme) || "blob".equalsIgnoreCase(scheme)
                || "data".equalsIgnoreCase(scheme)) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show(); }
        catch (Exception e) { Toast.makeText(this, "Could not open this link", Toast.LENGTH_SHORT).show(); }
        return true;
    }

    private void showError() {
        progress.setVisibility(View.GONE);
        error.setText("Can't load the website right now.\n\nCheck the TV's internet connection, then press SELECT to retry or BACK to leave.");
        error.setVisibility(View.VISIBLE);
        error.requestFocus();
    }

    private void hideVideo() { hideVideo(true); }

    private void hideVideo(boolean notifyChrome) {
        if (videoView == null) return;
        ((FrameLayout) getWindow().getDecorView()).removeView(videoView);
        videoView = null;
        web.setVisibility(View.VISIBLE);
        if (notifyChrome && videoCallback != null) videoCallback.onCustomViewHidden();
        videoCallback = null;
        web.requestFocus();
        immersive();
    }

    private boolean isMenuKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_MENU || keyCode == KeyEvent.KEYCODE_SETTINGS;
    }

    private boolean handleTvMenu(KeyEvent event) {
        if (!isMenuKey(event.getKeyCode())) return false;
        if (videoView != null) {
            // Give the active fullscreen player first chance to reveal its own controls/settings.
            boolean handled = false;
            try { handled = videoView.dispatchKeyEvent(event); } catch (Exception ignored) {}
            if (event.getAction() == KeyEvent.ACTION_UP && !handled && web != null) {
                web.evaluateJavascript("window.hianimeTvMenu && window.hianimeTvMenu('player')", null);
            }
            // Don't let Fire OS consume the remote's MENU key while our video is fullscreen.
            return true;
        }
        if (event.getAction() == KeyEvent.ACTION_UP && web != null) {
            web.evaluateJavascript("window.hianimeTvMenu && window.hianimeTvMenu('site')", null);
        }
        return true;
    }

    private boolean handleTvDpad(KeyEvent event) {
        if (videoView != null) {
            int key = event.getKeyCode();
            if (key == KeyEvent.KEYCODE_DPAD_LEFT || key == KeyEvent.KEYCODE_DPAD_RIGHT
                    || key == KeyEvent.KEYCODE_DPAD_UP || key == KeyEvent.KEYCODE_DPAD_DOWN
                    || key == KeyEvent.KEYCODE_DPAD_CENTER || key == KeyEvent.KEYCODE_ENTER
                    || key == KeyEvent.KEYCODE_NUMPAD_ENTER || key == KeyEvent.KEYCODE_SPACE) {
                boolean handled = false;
                try {
                    if (!videoView.hasFocus()) videoView.requestFocus();
                    handled = videoView.dispatchKeyEvent(event);
                } catch (Exception ignored) {}
                if (!handled && web != null) {
                    // Fallback for WebView-backed players whose fullscreen custom view
                    // does not consume remote keys; JS can reach only same-origin frames.
                    web.evaluateJavascript("window.hianimeTvPlayerKey && window.hianimeTvPlayerKey("
                            + key + ", " + event.getAction() + ")", null);
                }
                return true;
            }
            return false;
        }
        if (web == null || error != null && error.getVisibility() == View.VISIBLE || webHasEditableFocus) return false;
        String direction;
        switch (event.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_LEFT: direction = "left"; break;
            case KeyEvent.KEYCODE_DPAD_RIGHT: direction = "right"; break;
            case KeyEvent.KEYCODE_DPAD_UP: direction = "up"; break;
            case KeyEvent.KEYCODE_DPAD_DOWN: direction = "down"; break;
            default: return false;
        }
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            web.evaluateJavascript("window.hianimeTvNavigate && window.hianimeTvNavigate('" + direction + "')", null);
        }
        return true;
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        if (handleTvMenu(e)) return true;
        if (handleTvDpad(e)) return true;
        if (e.getAction() == KeyEvent.ACTION_UP && e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (videoView != null) { hideVideo(); return true; }
            if (web != null && web.canGoBack()) { web.goBack(); return true; }
        }
        if (e.getAction() == KeyEvent.ACTION_UP && e.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER
                && error != null && error.getVisibility() == View.VISIBLE) {
            web.reload();
            return true;
        }
        if (e.getAction() == KeyEvent.ACTION_UP && e.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER
                && !webHasEditableFocus && videoView == null) {
            web.evaluateJavascript("window.hianimeTvActivate && window.hianimeTvActivate()", null);
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        if (web != null) web.saveState(out);
        super.onSaveInstanceState(out);
    }

    @Override protected void onPause() {
        if (web != null) { web.onPause(); CookieManager.getInstance().flush(); }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        immersive();
        if (web != null) web.onResume();
    }

    @Override protected void onDestroy() {
        if (videoView != null) hideVideo();
        if (web != null) {
            web.stopLoading();
            web.loadUrl("about:blank");
            web.setWebChromeClient(null);
            web.setWebViewClient(null);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}