/* 1.
 *********************************************************************************************************************************
 *                                                                                                                               *
 *                                                   Global Variable Configuration                                               *
 *                                                                                                                               *
 *********************************************************************************************************************************
 */

//Global AJAX URL Constants
const bookingMonthURL =
  "/dcb/dynamic.php?dcbName=availabilityCalendarMeetingRoom&requestType=json";
const bookingDateURL =
  "/dcb/dynamic.php?dcbName=availabilityCalendarTimeSlotsMeetingRoom&requestType=json&reservation_date=";
const timeSlotURL =
  "/dcb/dynamic.php?dcbName=TimeSlotsRender&requestType=json&id=";

//Global Time Configurations
const lastBookingTime = "7:00 PM";
const closeTime = "9:30 PM";
const minBookingHours = 2; //Minimum Booking Time in hours
const cleaningTime = 2; //Cleaning time in hours

/* 2.
 *********************************************************************************************************************************
 *                                                                                                                               *
 *                                    AJAX Call to Get Already Booked Dates for the Month                                        *
 *                                                                                                                               *
 *********************************************************************************************************************************
 */

// Function to get booked dates asynchronously using a Promise
function getBookedDates(targetMonth, targetYear) {
  // Show Loading Screen
  $("#availability-calendar .loading-wrapper").show();

  return new Promise(function (resolve, reject) {
    $.ajax({
      url: bookingMonthURL,
      type: "GET",
      dataType: "json",
      success: function (response) {
        // Filter out non-object elements
        var validData = filterOutNonObjects(response.data);

        // Continue processing validData
        var transformedDates = processValidData(validData);
        resolve(transformedDates);
      },
      error: function (xhr, status, error) {
        // Reject the promise with an error message
        reject("AJAX request failed: " + status + " " + error);
      },
      complete: function () {
        // Remove loading message regardless of success or failure
        $("#availability-calendar .loading-wrapper").hide();
      },
    });

    // Function to filter out non-object elements from data
    function filterOutNonObjects(data) {
      return data.filter(function (item) {
        return typeof item === "object";
      });
    }

    // Function to process valid data
    function processValidData(validData) {
      // Function to filter data by month and year
      function filterDataByMonthAndYear(data, targetMonth, targetYear) {
        return data.filter(function (item) {
          // Check if the item has a 'date' property
          if (item.reservation_date) {
            // Parse the date string and get the month and year
            var dateParts = item.reservation_date.split("-");
            var itemMonth = parseInt(dateParts[1], 10);
            var itemYear = parseInt(dateParts[2], 10);

            // Check if the item's month and year match the target month and year
            return itemMonth === targetMonth && itemYear === targetYear;
          } else {
            // Handle the case where 'date' is not defined
            return false;
          }
        });
      }

      // Function to extract dates from filtered data
      function extractDates(filteredData) {
        return filteredData.map(function (item) {
          return item.reservation_date;
        });
      }

      // Example: Filter data for February (assuming 1-based index for months)
      let indexedOneMonth = targetMonth + 1;
      var filteredData = filterDataByMonthAndYear(
        validData,
        indexedOneMonth,
        targetYear
      );

      // Extract dates from the filtered data
      var datesArray = extractDates(filteredData);

      // Determine if each date is fully booked for the entire day
      var fullyBookedDates = datesArray.filter(function (date) {
        var reservationsForDate = validData.filter(function (item) {
          return item.reservation_date === date;
        });

        // Check if the date is fully booked based on the 'fullyBooked' property
        return (
          reservationsForDate.length > 0 &&
          reservationsForDate.every(function (item) {
            return item.full_day_booked === "Yes";
          })
        );
      });

      // Filter out fully booked dates to get not fully booked dates
      var notFullyBookedDates = datesArray.filter(function (date) {
        return !fullyBookedDates.includes(date);
      });

      function transformDateFormat(datesArray) {
        return datesArray.map(function (date) {
          var parts = date.split("-");
          // Rearrange the parts to the desired format
          return parts[1] + "/" + parts[0] + "/" + parts[2];
        });
      }

      var transformedFullyBookedDates = transformDateFormat(fullyBookedDates);
      var transformedNotFullyBookedDates =
        transformDateFormat(notFullyBookedDates);

      // Return the object with fullyBookedDates and notFullyBookedDates
      return {
        fullyBookedDates: fullyBookedDates,
        notFullyBookedDates: notFullyBookedDates,
      };
    }
  });
}

$(document).ready(function () {
  var currentDate = new Date();
  var currentYear = currentDate.getFullYear();
  var currentMonth = currentDate.getMonth();
  var currentDay = currentDate.getDate();
  var displayMonth = currentMonth;
  var displayYear = currentYear;

  /* 3.
   *********************************************************************************************************************************
   *                                                                                                                               *
   *                                            Render Months of Calender Functions                                                *
   *                                                                                                                               *
   *********************************************************************************************************************************
   */

  function navigateMonth(direction, unAvailableDates) {
    var newMonth = displayMonth + direction;
    var newYear = displayYear;

    if (newMonth < 0) {
      newMonth = 11; // December
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0; // January
      newYear++;
    }

    $("#current-month").text(getMonthYearString(newYear, newMonth));

    getBookedDates(newMonth, newYear)
      .then(function (transformedDates) {
        // Access the resolved values
        var fullyBookedDates = transformedDates.fullyBookedDates;
        var notFullyBookedDates = transformedDates.notFullyBookedDates;

        // Now you can use these values as needed
        //console.log('Fully Booked Dates:', fullyBookedDates);
        //console.log('Not Fully Booked Dates:', notFullyBookedDates);

        // For example, pass them to the renderCalendar function
        renderCalendar(
          newYear,
          newMonth,
          notFullyBookedDates,
          fullyBookedDates
        );
      })
      .catch(function (error) {
        console.error(error);
      });

    displayMonth = newMonth;
    displayYear = newYear;
  }

  function renderCalendar(year, month, unAvailableDates, fullyBookedDates) {
    $(".calendar-grid").empty();

    // Determine if the current month
    var isCurrentMonth = year === currentYear && month === currentMonth;

    // Add "inactive" class to previous button if current month
    $("#prev-month").toggleClass("inactive", isCurrentMonth);

    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);

    $("#current-month").text(getMonthYearString(year, month));

    // Display day names
    var dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    for (var i = 0; i < dayNames.length; i++) {
      $(".calendar-grid").append(
        '<div class="day day-name">' + dayNames[i] + "</div>"
      );
    }

    for (var i = firstDay.getDay(); i > 0; i--) {
      $(".calendar-grid").append('<div class="day"></div>');
    }

    for (var i = 1; i <= lastDay.getDate(); i++) {
      var dateString = formatDate(new Date(year, month, i));
      var dateArray = dateString.split("/");
      var rearrangedDate =
        dateArray[1] + "-" + dateArray[0] + "-" + dateArray[2];

      //console.log('Date (Default): '+ dateString);
      //console.log('Received (Rearranged): '+ rearrangedDate);

      var isAvailable = unAvailableDates.includes(rearrangedDate);
      var isFullDay = fullyBookedDates.includes(rearrangedDate);

      // Only append days with a date
      if (dateString !== "Invalid Date") {
        var dayElement = $(
          '<div class="day" data-date=' + rearrangedDate + ">" + i + "</div>"
        );

        if (!isAvailable && !isFullDay) {
          dayElement.addClass("active");
        } else if (!isFullDay) {
          dayElement.addClass("partial-active");
        } else {
          dayElement.addClass("inactive");
          dayElement.attr("title", "Not Available for Booking");
        }

        if (isCurrentMonth && i <= currentDay) {
          if (dayElement.hasClass("active")) {
            dayElement.removeClass("active");
          }
          if (dayElement.hasClass("partial-active")) {
            dayElement.removeClass("partial-active");
          }
          if (dayElement.hasClass("inactive")) {
            dayElement.removeClass("inactive");
          }
          dayElement.addClass("disabled");
        }

        $(".calendar-grid").append(dayElement);
      }
    }
    initiateTimeSlots();
  }

  function getMonthYearString(year, month) {
    var options = {
      year: "numeric",
      month: "long",
    };
    return new Date(year, month).toLocaleDateString("en-US", options);
  }

  function formatDate(date) {
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    var options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  }

  // Get Values from the Data Table and mark Not available dates
  getBookedDates(currentMonth, currentYear)
    .then(function (transformedDates) {
      // Access the resolved values
      var fullyBookedDates = transformedDates.fullyBookedDates;
      var notFullyBookedDates = transformedDates.notFullyBookedDates;

      // Now you can use these values as needed
      //console.log('Fully Booked Dates:', fullyBookedDates);
      //console.log('Not Fully Booked Dates:', notFullyBookedDates);

      renderCalendar(
        currentYear,
        currentMonth,
        notFullyBookedDates,
        fullyBookedDates
      );
    })
    .catch(function (error) {
      console.error(error);
    });

  $("#prev-month").click(function () {
    $(".calendar-grid").empty();
    if (!$(this).hasClass("inactive")) {
      navigateMonth(-1);
    }
  });

  $("#next-month").click(function () {
    $(".calendar-grid").empty();
    navigateMonth(1);
  });

  /* 4.
   *********************************************************************************************************************************
   *                                                                                                                               *
   *                                           Render Booked Time Slots for Booked Dates                                           *
   *                                                                                                                               *
   *********************************************************************************************************************************
   */

  const timeSlotContainer = $(".row-timeslots .slots-wrapper");
  const timeSlotLoadingContainer = $(".row-timeslots .loading-wrapper");
  let timeSlotContent = '<div class="time-slot"></div>';
  let timeSlotContentLoading = '<div class="custom-loader"></div>';
  let timeSlotContentEmpty =
    '<div class="time-slot">No bookings available</div>';

  function renderBookedTimeSlots(targetDate) {
    timeSlotLoadingContainer.html(timeSlotContentLoading);

    //console.log(targetDate);
    let ajaxUrl = bookingDateURL + targetDate; // Replace with your actual AJAX endpoint

    // Make the AJAX request
    $.ajax({
      url: ajaxUrl,
      type: "GET", // or 'POST' depending on your server-side configuration
      dataType: "json",
      success: function (response) {
        // Handle the successful response
        //console.log('AJAX request successful:', response);

        // Display time slots or a message
        if (response.success) {
          displayTimeSlots(response, targetDate);
        } else {
          timeSlotContainer.html(timeSlotContentEmpty);
          timeSlotLoadingContainer.empty();
        }

        //displayTimeSlots(response, targetDate);
        // Update the content or perform other actions based on the response
      },
      error: function (xhr, status, error) {
        // Handle errors during the AJAX request
        console.error("AJAX request failed:", status, error);
      },
      complete: function () {
        // Remove loading message regardless of success or failure
      },
    });
  }

  function renderTimeSlot(targetTimeSlot) {
    timeSlotLoadingContainer.html(timeSlotContentLoading);

    return new Promise(function (resolve, reject) {
      let ajaxUrl = timeSlotURL + targetTimeSlot; // Replace with your actual AJAX endpoint

      // Make the AJAX request
      $.ajax({
        url: ajaxUrl,
        type: "GET",
        dataType: "json",
        success: function (response) {
          // Handle the successful response
          //console.log('AJAX request successful:', response);

          if (response.success) {
            // Check if the response contains data at index 0
            if (response && response.data && response.data[0]) {
              // Assuming the time slot details are inside data[0]
              const timeSlotDetails = response.data[0];

              // Extract the necessary information
              const timeSlotName = timeSlotDetails.slot_time;

              // Resolve the promise with the time slot details
              resolve({ slot_time: timeSlotName });
            } else {
              console.error("Invalid response format:", response);
              reject("Invalid response format");
            }
          } else {
            timeSlotContainer.html(timeSlotContentEmpty);
          }
        },
        error: function (xhr, status, error) {
          // Reject the promise with an error
          console.error("AJAX request failed:", status, error);
          reject(error);
        },
        complete: function () {
          // Remove loading message regardless of success or failure
          timeSlotLoadingContainer.empty();
        },
      });
    });
  }

  function displayTimeSlots(response, dateRendering) {
    let validDateArray = dateRendering.split("-");
    var validRearrangedDate =
      validDateArray[1] + "/" + validDateArray[0] + "/" + validDateArray[2];

    if (
      response.success &&
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      // Loop through each booking in the response
      response.data.forEach(function (booking) {
        // Check if the booking contains start and end time slot IDs
        if (booking.reservation_start_time && booking.reservation_end_time) {
          // Extract start and end time slot IDs
          const startTimeSlot = booking.reservation_start_time;
          const endTimeSlot = booking.reservation_end_time;

          // Fetch time slot details for start and end time slots
          Promise.all([
            renderTimeSlot(startTimeSlot),
            renderTimeSlot(endTimeSlot),
          ])
            .then(function ([startSlotDetails, endSlotDetails]) {
              // Create HTML content using the resolved time slot names

              timeSlotContent = `<div class="time-slot not-available">${startSlotDetails.slot_time} - ${endSlotDetails.slot_time}</div>`;

              // Append the content to a container in your popup or wherever you want to display it
              timeSlotContainer.append(timeSlotContent);

              // Apply fade-in effect
              timeSlotContainer.find(".time-slot").last().hide().fadeIn();

              //Adjust Dropdowns
              hideNonAvailableStart(
                validRearrangedDate,
                startSlotDetails.slot_time,
                endSlotDetails.slot_time,
                minBookingHours,
                cleaningTime
              );
            })
            .catch(function (error) {
              console.error("Error fetching time slot details:", error);
            });
        } else {
          //console.error('Invalid booking format:', booking);
        }
      });
    } else {
      // Handle the case where there are no bookings or the response format is invalid
      timeSlotContent =
        '<div class="time-slot available">No bookings for this day.</div>';
      timeSlotLoadingContainer.empty();

      timeSlotContainer.html(timeSlotContent);

      timeSlotContainer.find(".time-slot").last().hide().fadeIn();
      //console.error('Invalid response format or no bookings:', response);
    }
  }

  /* 5.
   *********************************************************************************************************************************
   *                                                                                                                               *
   *                                           Open the Availability Popup and Close                                               *
   *                                                                                                                               *
   *********************************************************************************************************************************
   */

  //Open Time Slot Popup
  function initiateTimeSlots() {
    $(
      "#availability-calendar .day.active, #availability-calendar .day.partial-active"
    ).on("click", function () {
      $('#availabilityDropDown.cms-form select[name="form_time_start"]')
        .find("option:eq(0)")
        .prop("selected", true);
      $('#availabilityDropDown.cms-form select[name="form_time_end"]')
        .find("option:eq(0)")
        .prop("selected", true);
      timeSlotContainer.empty();

      setTimeout(function () {
        $(".timeslot-container").addClass("slots-open");
      }, 400);

      //Set the Time on Heading
      let dateStringClicked = $(this).data("date");
      let dateArray = dateStringClicked.split("-");
      let rearrangedDate =
        dateArray[1] + "/" + dateArray[0] + "/" + dateArray[2];
      let dateObject = new Date(rearrangedDate);
      formattedDate = dateObject.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      $("#picked-date").text(formattedDate);
      //console.log(rearrangedDate);

      //Call to Data Table
      // var dateArray = dateString.split('/');
      // var rearrangedDate = dateArray[1] + '-' + dateArray[0] + '-' + dateArray[2];

      renderBookedTimeSlots(dateStringClicked);

      //Initiate Select on Select
      initiateSelection(rearrangedDate);
    });

    $("#availability-calendar .day.inactive").on("click", function (event) {
      event.preventDefault();
    });
  }

  //Close Time Slot Popup

  // Click Outside
  $(".timeslot-container").on("click", function (event) {
    // Check if the click occurred outside the content
    if (!$(event.target).closest(".timeslot-content-wrapper").length) {
      // Remove the class or perform any action you want
      $(".timeslot-container").removeClass("slots-open");

      timeSlotContainer.empty();
      resetDropDowns();
    }
  });

  // Click Close Button
  $("#close-timeslots").on("click", function () {
    if ($(".timeslot-container").hasClass("slots-open")) {
      $(".timeslot-container").removeClass("slots-open");

      timeSlotContainer.empty();
      resetDropDowns();
    }
  });

  function resetDropDowns() {
    let startTimeDropdown = $(
      '#availabilityDropDown.cms-form select[name="form_time_start"]'
    );
    let endTimeDroptime = $(
      '#availabilityDropDown.cms-form select[name="form_time_end"]'
    );

    startTimeDropdown.find("option").each(function () {
      $(this).show();
    });

    endTimeDroptime.find("option").each(function () {
      $(this).show();
      if ($(this).hasClass("booked")) {
        $(this).removeClass("booked");
      }
    });
    startTimeDropdown.find("option:eq(0)").prop("selected", true);
    endTimeDroptime.find("option:eq(0)").prop("selected", true);
  }

  /* 6.
   *********************************************************************************************************************************
   *                                                                                                                               *
   *                                           Drop Down Functions with availability                                               *
   *                                                                                                                               *
   *********************************************************************************************************************************
   */

  function initiateSelection(dateSelected) {
    let passingStartTime = "";
    let passingEndTime = "";

    $('#availabilityDropDown.cms-form select[name="form_time_start"]').on(
      "change",
      function () {
        let selectedStartTime = $(this).val();

        passingStartTime = selectedStartTime;

        // Calculate the minimum selectable time for the end time based on the selected start time
        let selectedStartTimeObj = new Date(
          dateSelected + " " + selectedStartTime
        );
        //console.log(selectedStartTimeObj);

        //Change the End Time Selection respectively
        passingEndTime = setEndTimeSelection(
          selectedStartTimeObj,
          minBookingHours,
          true
        );
      }
    );

    $('#availabilityDropDown.cms-form select[name="form_time_end"]').on(
      "change",
      function () {
        let selectedEndTime = $(this).val();

        passingEndTime = selectedEndTime;
      }
    );

    $("#make-reservation").click(function (e) {
      // Prevent the default link behavior
      e.preventDefault();

      // Construct the link with variables
      let linkHref =
        "/hospitality/reservation.html?date=" +
        encodeURIComponent(dateSelected) +
        "&startTime=" +
        encodeURIComponent(passingStartTime) +
        "&endTime=" +
        encodeURIComponent(passingEndTime);

      // Redirect or perform any other action
      window.location.href = linkHref;
    });

    //Disable Booking Time after last booking time
    if (
      $('#availabilityDropDown.cms-form select[name="form_time_start"]')
        .length > 0
    ) {
      //Dropdowns
      const startTimeSelector = $(
        '#availabilityDropDown.cms-form select[name="form_time_start"]'
      );
      const endTimeSelector = $(
        '#availabilityDropDown.cms-form select[name="form_time_end"]'
      );

      let lastTime = new Date(dateSelected + " " + lastBookingTime);

      startTimeSelector.find("option").each(function () {
        const $option = $(this);
        const optionValue = new Date(dateSelected + " " + $option.val());

        if (optionValue.getTime() > lastTime.getTime()) {
          $option.hide();
        }

        let getTimeValue = $(
          '#availabilityDropDown.cms-form select[name="form_time_start"] option:eq(1)'
        ).val();
        let getMinStartTime = new Date(dateSelected + " " + getTimeValue);
        setEndTimeSelection(getMinStartTime, minBookingHours, false);
      });

      function setEndTimeSelection(startTime, timeGap, isVisible) {
        //Reset before proceeding
        endTimeSelector.find("option").each(function () {
          if (!$(this).hasClass("booked")) {
            $(this).show();
          } else {
            $(this).hide();
          }
        });

        // Create a new Date object to avoid modifying the original startTime
        let newEndTime = new Date(startTime);

        // Modify the hours of the newEndTime
        newEndTime.setHours(newEndTime.getHours() + timeGap);

        // Format the newEndTime to a string
        let setSelectedTime = newEndTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        let setCloseTime = new Date(dateSelected + " " + closeTime);

        if (isVisible === true) {
          // Set the selected option in the endTimeSelector
          endTimeSelector
            .find('option[value="' + setSelectedTime + '"]')
            .prop("selected", true);
        }

        let foundBooked = false;

        endTimeSelector.find("option").each(function () {
          const $option = $(this);
          const optionValue = new Date(dateSelected + " " + $option.val());

          if (optionValue.getTime() < newEndTime) {
            $option.hide();
          }

          if (optionValue.getTime() > setCloseTime) {
            $option.hide();
          }

          // if ($option.hasClass('booked')) {
          //     foundBooked = true;
          // }

          // if (foundBooked && optionValue.getTime() >= newEndTime) {
          //     $option.nextAll().hide();
          // }
        });

        return setSelectedTime;
      }
    }
  }

  function hideNonAvailableStart(
    dateSelected,
    minTime,
    maxTime,
    minTimeGap,
    inbetweenGap
  ) {
    let startTimeDropdown = $(
      '#availabilityDropDown.cms-form select[name="form_time_start"]'
    );

    let startHideTime = new Date(dateSelected + " " + minTime);
    let endHideTime = new Date(dateSelected + " " + maxTime);

    //console.log('Set Hide Start: ' + startHideTime);
    //console.log('Set Hide End: ' + endHideTime);

    // Modify the hours of the newEndTime
    startHideTime.setHours(
      startHideTime.getHours() - inbetweenGap - minTimeGap
    );
    endHideTime.setHours(endHideTime.getHours() + inbetweenGap);

    startTimeDropdown.find("option").each(function () {
      const $option = $(this);
      const optionValue = new Date(dateSelected + " " + $option.val());

      if (
        optionValue.getTime() > startHideTime.getTime() &&
        optionValue.getTime() < endHideTime.getTime()
      ) {
        $option.hide();
      }

      hideNonAvailableEnd(
        dateSelected,
        startHideTime,
        endHideTime,
        minTimeGap,
        inbetweenGap
      );
      //setEndTimeSelection(getMinStartTime, minBookingHours, false);
    });
  }

  function hideNonAvailableEnd(
    dateSelected,
    startHideTime,
    endHideTime,
    minTimeGap,
    inbetweenGap
  ) {
    let endTimeDroptime = $(
      '#availabilityDropDown.cms-form select[name="form_time_end"]'
    );

    let getMinStartTime = new Date(startHideTime);
    let getMinEndTime = new Date(endHideTime);

    // Modify the hours of the newEndTime
    getMinStartTime.setHours(getMinStartTime.getHours() + minTimeGap);
    getMinEndTime.setHours(getMinEndTime.getHours() + minTimeGap);

    endTimeDroptime.find("option").each(function () {
      const $optionEnd = $(this);
      const optionValueEnd = new Date(dateSelected + " " + $optionEnd.val());

      if (
        optionValueEnd.getTime() > getMinStartTime.getTime() &&
        optionValueEnd.getTime() < getMinEndTime.getTime()
      ) {
        $optionEnd.addClass("booked");
        $optionEnd.hide();
      }
    });
  }
});
