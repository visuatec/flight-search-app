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
                console.log("Flights data:", flights); // Log the array of flights to the console
                const tableBody = $('#flights-table tbody');
                tableBody.empty();

                if (!Array.isArray(flights) || flights.length === 0) {
                    $('#no-flights-message').text('No flights found for the given criteria. Please try different dates or airports.').show();
                    $('#flights-table').hide();
                    return;
                }

                $('#no-flights-message').hide(); // Hide any previous messages

                flights.forEach(flight => {
                    const itineraries = flight.itineraries ? `<span>${flight.itineraries}</span>` : 'N/A';

                    // Ensure deepLink is available and accessible
                    let baseAgentUrl = "https://www.skyscanner.com"; // Replace this with the actual base URL of the agent
                    const deepLink = flight.deepLink ? `<a href="${baseAgentUrl}${flight.deepLink}" target="_blank">Book Now</a>` : 'N/A';

                    // Extract and format the duration from the legs array
                    const legs = flight.legs || [];
                    const duration = legs
                        .map(leg => {
                            const parts = leg.split('-');
                            const durationPart = parts[parts.length - 1].trim(); // Extract the last part

                            if (durationPart.includes('mins')) {
                                const minutes = parseInt(durationPart.replace('mins', '').trim(), 10); // Extract the number
                                if (!isNaN(minutes)) {
                                    const hours = Math.floor(minutes / 60);
                                    const mins = minutes % 60;
                                    const hoursText = hours > 0 ? `${hours} hr` : '';
                                    const minutesText = mins > 0 ? `${mins} min` : '';
                                    return [hoursText, minutesText].filter(Boolean).join(' '); // Join non-empty parts
                                }
                            }
                            return ''; // Return empty string if duration is not in expected format
                        })
                        .filter(duration => duration) // Filter out empty strings
                        .join('<br>') || 'N/A'; // Join durations with line breaks or show 'N/A' if none found

                    // Extract and clean up segments with correct date formatting
                    const segments = flight.segments ? flight.segments.map(segment => {
                        const departureDateTime = formatCustomDateTime(segment.departure); // Correctly format the date and time
                        const arrivalDateTime = formatCustomDateTime(segment.arrival); // Correctly format the date and time
                        return `<span>${departureDateTime} - ${arrivalDateTime}</span>`;
                    }).join('<br>') : 'N/A';

                    const fromToPlaces = flight.places ? (() => {
                        const placeMap = flight.places.reduce((acc, place) => {
                            acc[place.id] = place;
                            return acc;
                        }, {});

                        const segments = flight.segments || [];
                        if (segments.length === 0) {
                            console.warn('No segments data available for flight:', flight);
                            return { from: 'No segments data available', to: 'No segments data available' };
                        }

                        const fromPlaces = [];
                        const toPlaces = [];

                        segments.forEach(segment => {
                            const fromPlace = placeMap[segment.origin_place_id] || { name: 'Unknown', alt_id: 'N/A' };
                            const toPlace = placeMap[segment.destination_place_id] || { name: 'Unknown', alt_id: 'N/A' };

                            fromPlaces.push(`${fromPlace.name} (${fromPlace.alt_id})`);
                            toPlaces.push(`${toPlace.name} (${toPlace.alt_id})`);
                        });

                        return {
                            from: fromPlaces.join('<br>'),
                            to: toPlaces.join('<br>')
                        };
                    })() : { from: 'N/A', to: 'N/A' };

                    const carriers = flight.carriers ? flight.carriers.map(carrier => `<span>${carrier}</span>`).join('<br>') : 'N/A';
                    const agents = flight.agents ? flight.agents.map(agent => `<span>${agent}</span>`).join('<br>') : 'N/A';
                    const price = flight.price ? `$${flight.price.amount}` : 'N/A'; // Added price information

                    tableBody.append(`
                        <tr>
                           <td>${deepLink}</td>
                            <td>${duration}</td> <!-- Updated to display only valid durations -->
                            <td>${segments}</td> <!-- Updated to format segments correctly -->
                            <td>${fromToPlaces.from}</td> <!-- New From column -->
                            <td>${fromToPlaces.to}</td> <!-- New To column -->
                            <td>${carriers}</td>
                            <td>${agents}</td>
                            <td>${price}</td>
                        </tr>
                    `);
                });

                $('#flights-table').show(); // Show the table after data is appended
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

    // Correct function to format date and time from "YYYY-MM-DDTHH:MM:SS" format
    function formatCustomDateTime(dateTimeString) {
        if (!dateTimeString) return 'Invalid date/time';
        try {
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) throw new Error('Invalid date');
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}th ${month} ${year}, ${hours}:${minutes}`;
        } catch (error) {
            console.error('Error parsing date:', error);
            return 'Invalid date/time';
        }
    }

    fetchAllAirports();
});
