const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const $ = id => document.getElementById(id);

let unit = "c";          // "c" or "f"
let lastData = null;     // latest result, kept so the unit toggle can re-render
let controller = null;   // cancels an older request when a new search starts

class CityNotFoundError extends Error {}

// ---------- API ----------
async function fetchJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Request failed with status " + res.status);
  return res.json();
}

async function getCoordinates(city, signal) {
  const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJson(url, signal);
  if (!data.results || !data.results.length) throw new CityNotFoundError();
  const { name, country, admin1, latitude, longitude } = data.results[0];
  return { name, country, admin1, latitude, longitude };
}

async function getWeather(lat, lon, signal) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: "auto", forecast_days: 5,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min"
  });
  return fetchJson(`${WEATHER_URL}?${params}`, signal);
}

// ---------- Weather code mapping (WMO) ----------
function describe(code, isDay) {
  if (code === 0)  return { label: isDay ? "Sunny" : "Clear night", icon: isDay ? "☀️" : "🌙", sky: isDay ? "day" : "night" };
  if (code === 1)  return { label: "Mostly clear", icon: isDay ? "🌤️" : "🌙", sky: isDay ? "day" : "night" };
  if (code === 2)  return { label: "Partly cloudy", icon: isDay ? "⛅" : "☁️", sky: isDay ? "day" : "night" };
  if (code === 3)  return { label: "Overcast", icon: "☁️", sky: isDay ? "cloudy" : "night" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "🌫️", sky: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️", sky: "rain" };
  if (code >= 61 && code <= 67) return { label: "Rainy", icon: "🌧️", sky: "rain" };
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return { label: "Snowy", icon: "❄️", sky: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "🌧️", sky: "rain" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️", sky: "storm" };
  return { label: "Unknown", icon: "🌡️", sky: isDay ? "day" : "night" };
}

// ---------- Formatting ----------
const toTemp = c => Math.round(unit === "c" ? c : c * 9 / 5 + 32) + "°";
const toWind = kmh => unit === "c" ? Math.round(kmh) + " km/h" : Math.round(kmh * 0.621371) + " mph";
const dayName = (iso, i) => i === 0 ? "Today" : new Date(iso + "T00:00").toLocaleDateString(undefined, { weekday: "short" });

// ---------- Rendering ----------
function render() {
  if (!lastData) return;
  const { place, weather } = lastData;
  const c = weather.current;
  const info = describe(c.weather_code, c.is_day === 1);

  document.body.dataset.sky = info.sky;
  $("place").textContent = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  $("when").textContent = new Date(c.time.slice(0, 10) + "T00:00")
    .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) + " · " + c.time.slice(11, 16) + " local time";
  $("icon").textContent = info.icon;
  $("temp").textContent = toTemp(c.temperature_2m) + (unit === "c" ? "C" : "F");
  $("desc").textContent = info.label;
  $("feels").textContent = toTemp(c.apparent_temperature);
  $("humidity").textContent = c.relative_humidity_2m + "%";
  $("wind").textContent = toWind(c.wind_speed_10m);
  $("pressure").textContent = Math.round(c.surface_pressure) + " hPa";

  const d = weather.daily;
  $("forecast").innerHTML = d.time.map((date, i) => {
    const w = describe(d.weather_code[i], true);
    return `<div class="day">
      <div class="d">${dayName(date, i)}</div>
      <div class="i" title="${w.label}" aria-label="${w.label}">${w.icon}</div>
      <div class="hi">${toTemp(d.temperature_2m_max[i])}</div>
      <div class="lo">${toTemp(d.temperature_2m_min[i])}</div>
    </div>`;
  }).join("");

  $("result").hidden = false;
}

function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = false;
  $("result").hidden = true;
}

// ---------- Search flow ----------
async function searchCity(city) {
  city = city.trim();
  if (!city) { showError("Enter a city name to search."); return; }

  if (controller) controller.abort();
  controller = new AbortController();
  const { signal } = controller;

  $("error").hidden = true;
  $("result").hidden = true;
  $("loading").hidden = false;

  try {
    const place = await getCoordinates(city, signal);
    const weather = await getWeather(place.latitude, place.longitude, signal);
    lastData = { place, weather };
    render();
    try { localStorage.setItem("skycast.city", place.name); } catch (e) {}
  } catch (err) {
    if (err.name === "AbortError") return;   // replaced by a newer search
    if (err instanceof CityNotFoundError) {
      showError(`We couldn't find "${city}". Check the spelling or try a nearby larger city.`);
    } else if (!navigator.onLine) {
      showError("You're offline. Reconnect to the internet and search again.");
    } else {
      showError("Weather data is unavailable right now. Please try again in a moment.");
    }
  } finally {
    if (!signal.aborted) $("loading").hidden = true;
  }
}

// ---------- Events ----------
$("search").addEventListener("submit", e => { e.preventDefault(); searchCity($("city").value); });

function setUnit(u) {
  unit = u;
  $("u-c").setAttribute("aria-pressed", u === "c");
  $("u-f").setAttribute("aria-pressed", u === "f");
  try { localStorage.setItem("skycast.unit", u); } catch (e) {}
  render();
}
$("u-c").onclick = () => setUnit("c");
$("u-f").onclick = () => setUnit("f");

$("chips").innerHTML = ["London", "Tokyo", "New York", "Sydney"]
  .map(c => `<button type="button">${c}</button>`).join("");
$("chips").addEventListener("click", e => {
  if (e.target.tagName === "BUTTON") { $("city").value = e.target.textContent; searchCity(e.target.textContent); }
});

// ---------- Startup ----------
let savedCity = "London", savedUnit = "c";
try { savedCity = localStorage.getItem("skycast.city") || savedCity; savedUnit = localStorage.getItem("skycast.unit") || "c"; } catch (e) {}
setUnit(savedUnit);
$("city").value = savedCity;
searchCity(savedCity);