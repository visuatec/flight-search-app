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
                console.log("Flights data:", flights);
                const tableBody = $('#flights-table tbody');
                tableBody.empty();

                flights.forEach(flight => {
                    if (!flight || !flight.departure || !flight.arrival || !flight.airline) {
                        console.error("Incomplete flight data:", flight);
                        return;
                    }
                    tableBody.append(`
                        <tr>
                            <td>${flight.departure.airport || 'N/A'}</td>
                            <td>${flight.departure.dateTime || 'N/A'}</td>
                            <td>${flight.arrival.airport || 'N/A'}</td>
                            <td>${flight.arrival.dateTime || 'N/A'}</td>
                            <td>${flight.airline.name || 'N/A'}</td>
                            <td>${flight.flightNumber || 'N/A'}</td>
                            <td>${flight.price.total || 'N/A'}</td>
                            <td>${flight.duration || 'N/A'}</td>
                            <td>${flight.stops || 'N/A'}</td>
                        </tr>
                    `);
                });

                $('#flights-table').show();
            },
            error: function (error) {
                console.error("Error fetching flight data:", error);
                alert('Failed to fetch flight data. Please try again.');
            }
        });
    });

    fetchAllAirports();
});
