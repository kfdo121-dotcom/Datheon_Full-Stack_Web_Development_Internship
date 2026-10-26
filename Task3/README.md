Skycast: Live Weather Search

A responsive weather dashboard built with plain HTML, CSS and JavaScript. Search any city in the world for current conditions and a 5-day forecast.

Live demo: https://your-username.github.io/skycast (replace after deploying)

Features
City search with geocoding, so it works for cities worldwide
Current temperature, conditions, feels-like, humidity, wind speed and pressure
Dynamic weather icons that change between day and night
Background gradient that changes for sunny, night, cloudy, rain, storm, snow and fog
5-day forecast cards built with Array.map()
Loading spinner, plus friendly errors for unknown cities, offline use and API failures
°C / °F toggle; your last city and unit are remembered
Older requests are cancelled with AbortController, so fast searches never show stale results
Mobile-first layout with Flexbox and CSS Grid
Data source and API keys

This project uses Open-Meteo, which is free for non-commercial use and needs no API key. That matters for a static site: a key placed in front-end JavaScript is visible to everyone.

If you prefer OpenWeatherMap or WeatherAPI, swap the two functions getCoordinates() and getWeather() in script.js and map their response fields. Keep any key out of the public repo, for example by proxying requests through a serverless function.

Files
skycast/
├── index.html
├── style.css
├── script.js
└── README.md
Run locally

Open index.html in a browser, or serve the folder:

bash
npx serve .
Deploy

GitHub Pages: push to a public repo, then Settings → Pages → Deploy from a branch → main / root. Vercel / Netlify: import the repo, no build command, publish directory ..

Credits

Weather data by Open-Meteo (CC BY 4.0). Icons are emoji.

License

MIT