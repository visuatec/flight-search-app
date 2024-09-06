$(document).ready(function () {
    let airportsData = [];

    function fetchAllAirports() {
        $.ajax({
            url: '/get-airports',
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                airportsData = data;
                console.log("All Airports Data Loaded:", airportsData);
            },
            error: function (error) {
                console.error("Error fetching airports:", error);
            }
        });
    }

    function filterAirports(airports, term) {
        if (!Array.isArray(airports)) {
            console.error("Expected an array for airports, but received:", airports);
            return [];
        }

        const searchTerm = term.toLowerCase();
        return airports.filter(airport => {
            const name = airport.label ? airport.label.toLowerCase() : "";
            const code = airport.value ? airport.value.toLowerCase() : "";
            return name.includes(searchTerm) || code.includes(searchTerm);
        }).sort((a, b) => {
            const aCode = a.value.toLowerCase();
            const bCode = b.value.toLowerCase();
            return aCode.startsWith(searchTerm) && !bCode.startsWith(searchTerm) ? -1 : bCode.startsWith(searchTerm) && !aCode.startsWith(searchTerm) ? 1 : aCode.localeCompare(bCode);
        });
    }

    ["#source-airport", "#destination-airport"].forEach(selector => {
        $(selector).autocomplete({
            source: function (request, response) {
                response(filterAirports(airportsData, request.term));
            },
            minLength: 2
        });
    });

$(document).ready(function () {
    $('#flight-form').on('submit', function (e) {
        e.preventDefault();
        const sourceAirport = $('#source-airport').val();
        const destinationAirport = $('#destination-airport').val();
        const departureDate = $('#departure-date').val();
        const returnDate = $('#return-date').val();

        $.ajax({
            url: '/search-flights',
            method: 'GET',
            data: {
                source_airport: sourceAirport,
                destination_airport: destinationAirport,
                departure_date: departureDate,
                return_date: returnDate
            },
            success: function (flights) {
                const tableBody = $('#flights-table tbody');
                tableBody.empty();

                if (flights.length === 0) {
                    $('#no-flights-message').text('No flights found for the given criteria. Please try different dates or airports.').show();
                    $('#flights-table').hide();
                    return;
                }

                $('#no-flights-message').hide(); // Hide any previous messages

                flights.forEach(flight => {
                    const itineraries = flight.itineraries ? `<span>${flight.itineraries}</span>` : 'N/A';
                    const deepLink = flight.deepLink ? `<a href="${flight.deepLink}" target="_blank">Book Now</a>` : 'N/A';
                    const legs = flight.legs ? flight.legs.map(leg => `<span>${leg}</span>`).join('<br>') : 'N/A';
                    const segments = flight.segments ? flight.segments.map(segment => `<span>${segment.id || 'N/A'} - ${segment.duration_minutes || 'N/A'} mins</span>`).join('<br>') : 'N/A';
                    const places = flight.places ? flight.places.map(place => `<span>${place.name || 'N/A'} (${place.id || 'N/A'})</span>`).join('<br>') : 'N/A';
                    const carriers = flight.carriers ? flight.carriers.map(carrier => `<span>${carrier}</span>`).join('<br>') : 'N/A';
                    const agents = flight.agents ? flight.agents.map(agent => `<span>${agent}</span>`).join('<br>') : 'N/A';

                    tableBody.append(`
                        <tr>
                            <td>${itineraries}</td>
                            <td>${deepLink}</td>
                            <td>${legs}</td>
                            <td>${segments}</td>
                            <td>${places}</td>
                            <td>${carriers}</td>
                            <td>${agents}</td>
                        </tr>
                    `);
                });

                $('#flights-table').show();
            },
            error: function (error) {
                if (error.status === 404) {
                    $('#no-flights-message').text('No flights found for the given criteria. Please try different dates or airports.').show();
                    $('#flights-table').hide();
                } else {
                    console.error("Error fetching flight data:", error);
                    alert('Failed to fetch flight data. Please try again.');
                }
            }
        });
    });
});


    fetchAllAirports();
});
