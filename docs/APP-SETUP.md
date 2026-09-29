# Home-screen app: one-time setup

The app is the same code as the Webflow pages, published to Firebase Hosting so it can be installed
on a phone and (next) send notifications. `node build.mjs` writes it to `app/`; pushing to main
publishes it through `.github/workflows/deploy-app.yml`.

Pages: `/` Check-in · `/routines` Habits · `/work` Work · `/progress` Progress.

## 1. Turn on Hosting (Firebase console, once)
Build → Hosting → Get started. Click through; skip the command-line steps.

## 2. Give GitHub a deploy key (once)
1. Google Cloud console → IAM → find `firebase-adminsdk-…@upward-spiral-of-awesomeness.iam.gserviceaccount.com`
   → Edit → add roles **Firebase Hosting Admin** and **API Keys Viewer** → Save.
2. Firebase console → ⚙ Project settings → Service accounts → **Generate new private key**.
3. GitHub → koalable/upward-spiral → Settings → Secrets and variables → Actions → New secret.
   Name `FIREBASE_SERVICE_ACCOUNT`, value = the whole contents of the downloaded file. Then delete the file.
4. GitHub → Actions → Deploy app → Run workflow. The app appears at
   https://upward-spiral-of-awesomeness.web.app

## 3. app.kstarr.com
1. Firebase → Hosting → Add custom domain → `app.kstarr.com`.
2. Add the records it shows at wherever kstarr.com's DNS lives. Wait for "Connected".
3. Firebase → Authentication → Settings → Authorized domains → add `app.kstarr.com`.

## 4. Install on iPhone
Open app.kstarr.com in Safari → Share → Add to Home Screen → open it from the home screen → sign in.

## Notes
- Sign-in inside the installed app uses a redirect on the app's own domain (authDomain = the page's host),
  which Firebase Hosting serves at `/__/auth`. That's why the app isn't on GitHub Pages or Webflow.
- The service worker is network-first, so a release shows up the next time the app opens.
