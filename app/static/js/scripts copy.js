$(document).ready(function () {
    let airportsData = [];

    // Fetch all airports data for autocomplete
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

    // Markdown converter initialization
    var converter = new showdown.Converter();

    // Handle prompt submission and sending it to /send_prompt endpoint
    $('#send-prompt-btn').on('click', function () {
        const prompt = $('#custom-prompt').val();

        if (!prompt) {
            alert('Please enter a valid prompt.');
            return;
        }

        $.ajax({
            url: '/send_prompt',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt }),
            success: function (response) {
                const resultDiv = $('#prompt-response');
                if (response && response.summary) {
                    // Convert Markdown to HTML
                    const htmlContent = converter.makeHtml(response.summary);
                    // Inject HTML into the div
                    resultDiv.html(htmlContent).show();
                } else {
                    resultDiv.html('<p>Error: No response from GPT-4o.</p>').show();
                }
            },
            error: function (error) {
                $('#prompt-response').html('<p>Error: Could not send prompt.</p>').show();
            }
        });
    });

    // Filter airports based on the search term
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

    // Autocomplete for source and destination airport fields
    ["#source-airport", "#destination-airport"].forEach(selector => {
        $(selector).autocomplete({
            source: function (request, response) {
                response(filterAirports(airportsData, request.term));
            },
            minLength: 2
        });
    });

    // Handle the flight search form submission
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

                if (!Array.isArray(flights) || flights.length === 0) {
                    $('#no-flights-message').text('No flights found for the given criteria. Please try different dates or airports.').show();
                    $('#flights-table').hide();
                    return;
                }

                $('#no-flights-message').hide();

                flights.forEach(flight => {
                    const departureSegments = flight.segments.slice(0, Math.floor(flight.segments.length / 2));
                    const returnSegments = flight.segments.slice(Math.floor(flight.segments.length / 2));

                    let baseAgentUrl = "https://www.skyscanner.com";
                    const deepLink = flight.deepLink ? `<a href="${baseAgentUrl}${flight.deepLink}" target="_blank">Book Now</a>` : 'N/A';

                    const formatDuration = (leg) => {
                        const parts = leg.split('-');
                        const durationPart = parts[parts.length - 1].trim();

                        if (durationPart.includes('mins')) {
                            const minutes = parseInt(durationPart.replace('mins', '').trim(), 10);
                            if (!isNaN(minutes)) {
                                const hours = Math.floor(minutes / 60);
                                const mins = minutes % 60;
                                const hoursText = hours > 0 ? `${hours} hr` : '';
                                const minutesText = mins > 0 ? `${mins} min` : '';
                                return [hoursText, minutesText].filter(Boolean).join(' ');
                            }
                        }
                        return 'N/A';
                    };

                    const durations = {
                        departure: formatDuration(flight.legs[1] || 'N/A'),
                        return: formatDuration(flight.legs[2] || 'N/A')
                    };

                    const formatSegments = (segments) => segments.map(segment => {
                        const departureDateTime = formatCustomDateTime(segment.departure);
                        const arrivalDateTime = formatCustomDateTime(segment.arrival);
                        return `${departureDateTime} - ${arrivalDateTime}`;
                    }).join('<br>');

                    const formattedSegments = {
                        departure: formatSegments(departureSegments),
                        return: formatSegments(returnSegments)
                    };

                    const formatFromToPlaces = (segments) => {
                        const placeMap = flight.places.reduce((acc, place) => {
                            acc[place.id] = place;
                            return acc;
                        }, {});

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
                    };

                    const fromToPlaces = {
                        departure: formatFromToPlaces(departureSegments),
                        return: formatFromToPlaces(returnSegments)
                    };

                    function formatCarriers(carriers) {
                        const uniqueCarriers = [...new Set(carriers)];
                        return uniqueCarriers.join('<br>') || 'Unknown Carrier';
                    }

                    const agents = flight.agents ? flight.agents.map(agent => `<span>${agent}</span>`).join('<br>') : 'N/A';
                    const price = flight.price ? `$${flight.price.amount}` : 'N/A';

                    tableBody.append(`
                        <tr>
                            <td rowspan="2">${deepLink}</td> <!-- Booking link remains in a single cell -->
                            <td>${durations.departure}</td>
                            <td>${formattedSegments.departure}</td>
                            <td>${fromToPlaces.departure.from}</td>
                            <td>${fromToPlaces.departure.to}</td>
                            <td>${formatCarriers(flight.carriers)}</td> <!-- Use formatted carriers without duplicates -->
                            <td rowspan="2">${agents}</td>
                            <td rowspan="2">${price}</td>
                        </tr>
                        <tr>
                            <td>${durations.return}</td>
                            <td>${formattedSegments.return}</td>
                            <td>${fromToPlaces.return.from}</td>
                            <td>${fromToPlaces.return.to}</td>
                            <td>${formatCarriers(flight.carriers)}</td> <!-- Repeat for return leg if needed -->
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

    // Format date and time from "YYYY-MM-DDTHH:MM:SS" format
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

    function sortTable(columnIndex, isNumeric, isAscending) {
        const rows = $('#flights-table tbody tr').get();
        const rowGroups = [];

        for (let i = 0; i < rows.length; i += 2) {
            rowGroups.push([rows[i], rows[i + 1]]);
        }

        rowGroups.sort((a, b) => {
            let A = $(a[0]).children('td').eq(columnIndex).text().toUpperCase();
            let B = $(b[0]).children('td').eq(columnIndex).text().toUpperCase();

            if (isNumeric) {
                A = parseFloat(A.replace(/[^\d.-]/g, '')) || 0;
                B = parseFloat(B.replace(/[^\d.-]/g, '')) || 0;
            } else if (A.includes('hr') || A.includes('min')) {
                A = durationToMinutes(A);
                B = durationToMinutes(B);
            }

            if (A < B) {
                return isAscending ? -1 : 1;
            }
            if (A > B) {
                return isAscending ? 1 : -1;
            }
            return 0;
        });

        $.each(rowGroups, (index, rowGroup) => {
            $('#flights-table tbody').append(rowGroup[0]);
            $('#flights-table tbody').append(rowGroup[1]);
        });
    }

    function durationToMinutes(duration) {
        let hours = 0, minutes = 0;
        if (duration.includes('hr')) {
            const hrParts = duration.split('hr');
            hours = parseInt(hrParts[0].trim());
            if (hrParts[1]) {
                minutes = parseInt(hrParts[1].replace('min', '').trim()) || 0;
            }
        } else if (duration.includes('min')) {
            minutes = parseInt(duration.replace('min', '').trim());
        }
        return (hours * 60) + minutes;
    }

    let durationAscending = true;
    let priceAscending = true;
    $('#sort-duration').on('click', function () {
        sortTable(1, false, durationAscending);
        durationAscending = !durationAscending;
        updateSortArrow($(this), durationAscending);
    });
    $('#sort-price').on('click', function () {
        sortTable(7, true, priceAscending);
        priceAscending = !priceAscending;
        updateSortArrow($(this), priceAscending);
    });

    function updateSortArrow(element, ascending) {
        element.siblings().removeClass('sort-asc sort-desc');
        element.toggleClass('sort-asc', ascending).toggleClass('sort-desc', !ascending);
    }

    // Fetch airports on page load
    fetchAllAirports();
});
