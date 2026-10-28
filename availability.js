(function () {
    "use strict";

    const rooms = [
        {
            id: "sea-view-room",
            name: "Sea View Room",
            type: "Room",
            capacity: 2,
            inventory: 22,
            baseRate: 320,
            seed: 11,
            image: "assets/images/Room.jpeg",
            description: "A calm coastal room with a private balcony and uninterrupted views across the Aegean.",
            amenities: ["King bed", "Sea balcony", "Breakfast"]
        },
        {
            id: "sunrise-suite",
            name: "Sunrise Suite",
            type: "Suite",
            capacity: 3,
            inventory: 14,
            baseRate: 470,
            seed: 29,
            image: "assets/images/Room.png",
            description: "Generous indoor-outdoor living, a deep stone bath and a terrace made for slow mornings.",
            amenities: ["King bed", "Private terrace", "Stone bath"]
        },
        {
            id: "horizon-suite",
            name: "Horizon Suite",
            type: "Signature suite",
            capacity: 4,
            inventory: 6,
            baseRate: 680,
            seed: 47,
            image: "assets/images/ocean-suite.jpg",
            description: "Our most spacious retreat, with a separate lounge, sunset terrace and panoramic sea views.",
            amenities: ["2 bedrooms", "Sunset terrace", "Living room"]
        }
    ];

    const form = document.querySelector("#availability-form");
    if (!form) return;

    const arrivalInput = document.querySelector("#arrival");
    const departureInput = document.querySelector("#departure");
    const guestsInput = document.querySelector("#guests");
    const message = document.querySelector("#booking-message");
    const resultsSection = document.querySelector("#availability-results");
    const resultsHeading = document.querySelector("#availability-heading");
    const resultsGrid = document.querySelector("#availability-grid");
    const submitButton = form.querySelector("button[type='submit']");
    const originalButtonContent = submitButton.innerHTML;
    const millisecondsPerDay = 86400000;
    const currency = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    });
    const fullDate = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    function atMidday(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    }

    function addDays(date, numberOfDays) {
        const nextDate = atMidday(date);
        nextDate.setDate(nextDate.getDate() + numberOfDays);
        return nextDate;
    }

    function toInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function fromInputDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day, 12);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }
        return date;
    }

    function numberOfNights(arrival, departure) {
        const arrivalUtc = Date.UTC(arrival.getFullYear(), arrival.getMonth(), arrival.getDate());
        const departureUtc = Date.UTC(departure.getFullYear(), departure.getMonth(), departure.getDate());
        return Math.round((departureUtc - arrivalUtc) / millisecondsPerDay);
    }

    function stayDates(arrival, nights) {
        return Array.from({ length: nights }, (_, index) => addDays(arrival, index));
    }

    function availabilityForDate(room, date) {
        const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay);
        const wave = Math.sin(dayNumber * 12.9898 + room.seed * 78.233) * 43758.5453;
        const demand = wave - Math.floor(wave);

        if (demand > 0.94) return 0;
        return Math.max(1, Math.floor(room.inventory * (0.12 + (1 - demand) * 0.4)));
    }

    function nightlyRate(room, date) {
        const month = date.getMonth();
        const day = date.getDay();
        const seasonalIncrease = month >= 5 && month <= 8 ? 0.22 : (month === 4 || month === 9 ? 0.1 : 0);
        const weekendIncrease = day === 5 || day === 6 ? 0.12 : 0;
        return Math.round((room.baseRate * (1 + seasonalIncrease + weekendIncrease)) / 10) * 10;
    }

    function setError(text) {
        message.textContent = text;
        message.classList.add("is-error");
        resultsSection.hidden = true;
    }

    function clearError() {
        message.textContent = "";
        message.classList.remove("is-error");
    }

    function validateSearch() {
        const arrival = fromInputDate(arrivalInput.value);
        const departure = fromInputDate(departureInput.value);
        const guests = Number(guestsInput.value);
        const today = atMidday(new Date());
        const lastArrival = addDays(today, 365);

        if (!arrival || !departure) {
            setError("Choose both an arrival and departure date.");
            return null;
        }

        if (arrival < today) {
            setError("Arrival must be today or later.");
            arrivalInput.focus();
            return null;
        }

        if (arrival > lastArrival) {
            setError("Online availability can be checked up to one year in advance.");
            arrivalInput.focus();
            return null;
        }

        const nights = numberOfNights(arrival, departure);
        if (nights < 1) {
            setError("Departure must be after your arrival date.");
            departureInput.focus();
            return null;
        }

        if (nights > 28) {
            setError("Online availability can be checked for stays of up to 28 nights.");
            departureInput.focus();
            return null;
        }

        if (!Number.isInteger(guests) || guests < 1 || guests > 4) {
            setError("Choose between one and four guests.");
            guestsInput.focus();
            return null;
        }

        return { arrival, departure, guests, nights };
    }

    function roomResult(room, search) {
        const dates = stayDates(search.arrival, search.nights);
        const remaining = Math.min(...dates.map((date) => availabilityForDate(room, date)));
        const total = dates.reduce((sum, date) => sum + nightlyRate(room, date), 0);

        return {
            ...room,
            remaining,
            total,
            averageRate: Math.round(total / search.nights)
        };
    }

    function requestLink(room, search) {
        const subject = `Room request — ${room.name}`;
        const body = [
            "Hello Sunrise reservations,",
            "",
            `I would like to request the ${room.name}.`,
            `Arrival: ${fullDate.format(search.arrival)}`,
            `Departure: ${fullDate.format(search.departure)}`,
            `Guests: ${search.guests}`,
            `Estimated stay total: ${currency.format(room.total)}`,
            "",
            "Please let me know the next steps."
        ].join("\n");

        return `mailto:elhachemyouri@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function cardMarkup(room, search) {
        const remainingLabel = room.remaining === 1 ? "Only 1 room left" : `${room.remaining} rooms left`;
        const guestLabel = room.capacity === 1 ? "Sleeps 1" : `Sleeps up to ${room.capacity}`;
        const amenityMarkup = room.amenities.map((amenity) => `<li>${amenity}</li>`).join("");

        return `
            <article class="availability-card">
                <div class="availability-card-image">
                    <img src="${room.image}" alt="${room.name} at Sunrise Hotel">
                    <p class="availability-badge">${remainingLabel}</p>
                </div>
                <div class="availability-card-body">
                    <p class="availability-card-meta">${room.type} &nbsp;·&nbsp; ${guestLabel}</p>
                    <h3>${room.name}</h3>
                    <p class="availability-card-description">${room.description}</p>
                    <ul class="availability-amenities" aria-label="Room highlights">${amenityMarkup}</ul>
                    <div class="availability-rate">
                        <p><strong>${currency.format(room.averageRate)}</strong><span>average per night</span></p>
                        <p class="availability-total"><strong>${currency.format(room.total)}</strong><span>${search.nights}-night stay</span></p>
                    </div>
                    <a class="availability-cta" href="${requestLink(room, search)}">Request this room <span aria-hidden="true">→</span></a>
                </div>
            </article>`;
    }

    function showResults(search) {
        const matchingRooms = rooms
            .filter((room) => room.capacity >= search.guests)
            .map((room) => roomResult(room, search))
            .filter((room) => room.remaining > 0)
            .sort((first, second) => first.averageRate - second.averageRate);

        if (matchingRooms.length) {
            resultsGrid.dataset.count = String(matchingRooms.length);
            resultsGrid.innerHTML = matchingRooms.map((room) => cardMarkup(room, search)).join("");
            message.textContent = `${matchingRooms.length} ${matchingRooms.length === 1 ? "room type is" : "room types are"} available for your stay.`;
        } else {
            resultsGrid.dataset.count = "0";
            resultsGrid.innerHTML = `
                <div class="availability-empty">
                    <h3>No rooms match the full stay.</h3>
                    <p>Try shifting your dates or reducing the length of your stay to see more options.</p>
                    <a href="#booking">Try different dates <span aria-hidden="true">↑</span></a>
                </div>`;
            message.textContent = "No rooms are available for the full stay. Try different dates.";
        }

        resultsSection.hidden = false;
        resultsHeading.setAttribute("tabindex", "-1");
        resultsSection.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
        });
        resultsHeading.focus({ preventScroll: true });
    }

    function updateDepartureLimit() {
        const arrival = fromInputDate(arrivalInput.value);
        if (!arrival) return;

        const firstDeparture = addDays(arrival, 1);
        departureInput.min = toInputDate(firstDeparture);
        if (!fromInputDate(departureInput.value) || departureInput.value < departureInput.min) {
            departureInput.value = toInputDate(addDays(arrival, 3));
        }
    }

    function initialiseDates() {
        const today = atMidday(new Date());
        const defaultArrival = addDays(today, 7);
        const defaultDeparture = addDays(defaultArrival, 3);
        const lastArrival = addDays(today, 365);

        arrivalInput.min = toInputDate(today);
        arrivalInput.max = toInputDate(lastArrival);
        departureInput.max = toInputDate(addDays(lastArrival, 28));
        arrivalInput.value = toInputDate(defaultArrival);
        departureInput.value = toInputDate(defaultDeparture);
        updateDepartureLimit();
    }

    form.addEventListener("change", function (event) {
        if (event.target === arrivalInput) updateDepartureLimit();
        clearError();
        resultsSection.hidden = true;
    });
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        clearError();
        const search = validateSearch();
        if (!search) return;

        submitButton.disabled = true;
        submitButton.textContent = "Checking your dates…";

        window.setTimeout(function () {
            showResults(search);
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonContent;
        }, 250);
    });

    initialiseDates();
}());
