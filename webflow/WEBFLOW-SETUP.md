# Webflow custom code (one-time setup)

Each page loads the latest code from GitHub (@main). Releases never need these boxes edited.

## checkin (/challenge)

### Head
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/app.css">
```

### Footer (before </body>)
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>window.WLC_CONFIG={firebase:{"apiKey":"AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ","authDomain":"upward-spiral-of-awesomeness.firebaseapp.com","projectId":"upward-spiral-of-awesomeness","appId":"1:445813281061:web:8982a5466586bce7828acc"},pages:{"checkin":"/challenge","routines":"/challenge-routines","work":"/challenge-work","progress":"/challenge-progress"}};if(!document.getElementById("wlc")){var d=document.createElement("div");d.id="wlc";document.body.appendChild(d)}</script>
<script src="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/checkin.js"></script>
```

## routines (/challenge-routines)

### Head
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/app.css">
```

### Footer (before </body>)
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>window.WLC_CONFIG={firebase:{"apiKey":"AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ","authDomain":"upward-spiral-of-awesomeness.firebaseapp.com","projectId":"upward-spiral-of-awesomeness","appId":"1:445813281061:web:8982a5466586bce7828acc"},pages:{"checkin":"/challenge","routines":"/challenge-routines","work":"/challenge-work","progress":"/challenge-progress"}};if(!document.getElementById("wlc")){var d=document.createElement("div");d.id="wlc";document.body.appendChild(d)}</script>
<script src="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/routines.js"></script>
```

## work (/challenge-work)

### Head
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/app.css">
```

### Footer (before </body>)
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>window.WLC_CONFIG={firebase:{"apiKey":"AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ","authDomain":"upward-spiral-of-awesomeness.firebaseapp.com","projectId":"upward-spiral-of-awesomeness","appId":"1:445813281061:web:8982a5466586bce7828acc"},pages:{"checkin":"/challenge","routines":"/challenge-routines","work":"/challenge-work","progress":"/challenge-progress"}};if(!document.getElementById("wlc")){var d=document.createElement("div");d.id="wlc";document.body.appendChild(d)}</script>
<script src="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/work.js"></script>
```

## progress (/challenge-progress)

### Head
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lucide-static@0.577.0/font/lucide.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/app.css">
```

### Footer (before </body>)
```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>window.WLC_CONFIG={firebase:{"apiKey":"AIzaSyCSXKB82V0RtKBV8f6IM7AA7wp1gsPcwYQ","authDomain":"upward-spiral-of-awesomeness.firebaseapp.com","projectId":"upward-spiral-of-awesomeness","appId":"1:445813281061:web:8982a5466586bce7828acc"},pages:{"checkin":"/challenge","routines":"/challenge-routines","work":"/challenge-work","progress":"/challenge-progress"}};if(!document.getElementById("wlc")){var d=document.createElement("div");d.id="wlc";document.body.appendChild(d)}</script>
<script src="https://cdn.jsdelivr.net/gh/koalable/upward-spiral@main/dist/cdn/progress.js"></script>
```
