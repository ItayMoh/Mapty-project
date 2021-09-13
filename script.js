'use strict';

class Workout {
  //Creating date object to implement time, using date as generating id (bad practice)
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  deleteButton = document.querySelector('.x');

  constructor(cords, distance, duration) {
    this.cords = cords; // [lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    //Settng a description for the workout type
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  //The Running object inherit properties and methods from Workout parent, adding additional condence property and calculating pace method
  type = 'running';

  constructor(cords, distance, duration, condence) {
    //defining the Running properties and setting a description to it
    super(cords, distance, duration);
    this.condence = condence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //calculating pace
    //Minutes per KM
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  //The Cycling object inherit properties and methods from Workout parent, adding additional elevation property and calculating speed method
  type = 'cycling';
  constructor(cords, distance, duration, elevation) {
    //defining the Cycling properties and setting a description to it
    super(cords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //calculating speed method
    //km/h
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

///////////////////////////////
//APPLICATION ARCHITECTURE

//Defining constants to manipulate dom objects
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let map, mapEvent;

class App {
  //Defining private properties to the App
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    //Get user's positition
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
  }

  _getPosition() {
    //Getting geolocation position (if existed)
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  _loadMap(position) {
    //This method loads the map and handles clicks on the map, which then create a form
    //Getting latitude and longitude of user position
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    //Marking user first position according to geolocation
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //Loading the markers of the localstorage workouts object
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    //Reveal the form to initiate workout documentation
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clearing the form values and making an animation to the form
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    //Toggling the form fields between two workouts, Running and Cycling
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //Two little function that validates the inputs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Check if Data is valid
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to the workout array
    this.#workouts.push(workout);
    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide form + Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //Display the marker
    L.marker(workout.cords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <buttom class="x small">x</buttom>
          <h2 class="workout__title">${workout.description}
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${(
      workout.distance /
      0.005 /
      workout.duration
    ).toFixed(1)}</span>
    <span class="workout__unit">spm</span>
  </div>
    </li>
    `;

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevation}</span>
    <span class="workout__unit">m</span>
  </div>
    </li>
    `;

    //Adding the newly created workout to the form dom element
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    //Move the map the the current clicked form workout marker

    //Getting the workout object by checking with the parent element form class workout
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    //Delete functionality
    if (e.target.className === 'x small') {
      this._deleteWorkout(workout);
      return;
    }

    //Zooming to the workout location
    this.#map.setView(workout.cords, this.#mapZoomLevel + 2, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface
    // workout.click();
  }

  _deleteWorkout(workout) {
    //Deletes a workout from the array and local storage, setting localstorage again and reloading
    const removeWorkOut = this.#workouts.indexOf(workout);
    this.#workouts.splice(removeWorkOut, 1);
    localStorage.removeItem('workouts');
    this._setLocalStorage();
    location.reload();
  }

  _setLocalStorage() {
    //Defining workout storage to store session workouts
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    //handle all the local storage workouts vision in the form element
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    //Reset the application
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
