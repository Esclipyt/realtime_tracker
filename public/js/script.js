const socket = io();
const map = L.map("map").setView([33.7, 73.06], 16); // H-10 Islamabad

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const markers = {};
let myCoords = null;

// Smooth marker movement function
function moveMarkerSmoothly(marker, fromLatLng, toLatLng, duration = 500) {
  const frames = 20;
  let i = 0;
  const deltaLat = (toLatLng[0] - fromLatLng[0]) / frames;
  const deltaLng = (toLatLng[1] - fromLatLng[1]) / frames;

  const interval = setInterval(() => {
    i++;
    const newLat = fromLatLng[0] + deltaLat * i;
    const newLng = fromLatLng[1] + deltaLng * i;
    marker.setLatLng([newLat, newLng]);
    if (i >= frames) clearInterval(interval);
  }, duration / frames);
}

// Watch user location
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      myCoords = [latitude, longitude];
      document.getElementById("myCoords").textContent = `${latitude.toFixed(
        4
      )}, ${longitude.toFixed(4)}`;

      socket.emit("send-location", { latitude, longitude });
    },
    (err) => console.error(err),
    { enableHighAccuracy: true, maximumAge: 0 }
  );
}

// Receive locations
socket.on("receive-location", (data) => {
  const { id, latitude, longitude } = data;
  const newPos = [latitude, longitude];

  if (!markers[id]) {
    markers[id] = L.marker(newPos)
      .addTo(map)
      .bindPopup(id === socket.id ? "You" : `User ${id}`);
  } else {
    moveMarkerSmoothly(markers[id], markers[id].getLatLng(), newPos, 500);
  }

  if (id === socket.id) map.setView(newPos, 16);

  updateUserList();
});

// Remove disconnected users
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
    updateUserList();
  }
});

// Update panel user list
function updateUserList() {
  const list = document.getElementById("userList");
  list.innerHTML = "";
  Object.keys(markers).forEach((id) => {
    const li = document.createElement("li");
    li.textContent = id === socket.id ? "👉 You" : `User ${id}`;
    list.appendChild(li);
  });
}

// Center button
document.getElementById("centerBtn").addEventListener("click", () => {
  if (myCoords) map.setView(myCoords, 16);
});
