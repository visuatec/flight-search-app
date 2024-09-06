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
                const tableBody = $('#flights-table tbody');
                tableBody.empty();

                if (flights.length === 0) {
                    $('#no-flights-message').text('No flights found for the given criteria. Please try different dates or airports.').show();
                    $('#flights-table').hide();
                    return;
                }

                $('#no-flights-message').hide(); // Hide any previous messages

                flights.forEach(flight => {
                    if (flight.pricing_options && Array.isArray(flight.pricing_options)) {
                        flight.pricing_options.forEach(option => {
                            if (option.items && Array.isArray(option.items)) {
                                option.items.forEach(item => {
                                    tableBody.append(`
                                        <tr>
                                            <td>${item.price.amount || 'N/A'}</td>
                                            <td>${item.agent_id || 'N/A'}</td>
                                            <td><a href="${item.url}" target="_blank">Book Now</a></td>
                                            <td>${option.score || 'N/A'}</td>
                                        </tr>
                                    `);
                                });
                            } else {
                                console.error("Unexpected data format: 'items' is undefined or not an array in pricing option:", option);
                            }
                        });
                    } else {
                        console.error("Unexpected data format: 'pricing_options' is undefined or not an array in flight:", flight);
                    }
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

    fetchAllAirports();
});
