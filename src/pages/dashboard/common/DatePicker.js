var INITIATE_DATE_PICKER = function() {
    try {
        const startDate = new Date(),
            month_old_1 = AG_GRID.MANIPULATE_DATES(new Date(), 15, {
                Date: true,
                Before: true
            }),
            month_old = AG_GRID.MANIPULATE_DATES(new Date(), 14, {
                Date: true,
                Before: true
            }),
            endDate = AG_GRID.MANIPULATE_DATES(new Date(), 1, {
                Date: true,
                After: true,
                GetTime: false
            });
        $('#date-start').attr("data-date", moment(month_old).format('DD-MMM-YYYY'));
        $('#date-end').attr("data-date", moment().format('DD-MMM-YYYY'));
        $(document).off('.datepicker.data-api');
        $('#date-start')
            .datepicker({
                autoclose: true,
                Date: moment(month_old).format('DD-MMM-YYYY')
            })
            .on('changeDate', function(ev) {
                if (ev.date.valueOf() > endDate.valueOf()) {
                    alert('The start date must be before the end date.');
                } else if (ev.date.valueOf() < month_old_1.valueOf()) {
                    $(ev.currentTarget).attr({
                        "data-value": month_old.valueOf(),
                        "data-date": moment(month_old).format('DD-MMM-YYYY')
                    }).data('date');
                    setTimeout((target) => {
                        target.querySelector("input").value = moment(month_old).format('DD-MMM-YYYY');
                    }, 750, ev.currentTarget);
                    startDate = new Date(month_old);
                    alert('The start date must be before/within two weeks date only.');
                } else {
                    startDate = new Date(ev.date);
                    $(ev.currentTarget).attr("data-value", ev.date.valueOf()).data('date');
                }
                $('#date-start').datepicker('hide');
            });
        $('#date-end')
            .datepicker({
                autoclose: true,
                Date: moment().format('DD-MMM-YYYY')
            })
            .on('changeDate', function(ev) {
                if (ev.date.valueOf() < startDate.valueOf()) {
                    alert('The end date must be after the start date.');
                } else {
                    endDate = new Date(ev.date);
                    $(ev.currentTarget).attr("data-value", ev.date.valueOf()).data('date');
                }
                $('#date-end').datepicker('hide');
            });
    } catch (err) {
        console.warn(err.message);
    }
};

function daterange(Start, End, Label) {
    //var start = moment().subtract(29, 'days');
    var start;
    var end;
    var label;
    if (Start !== undefined && Start !== null) {
        start = moment(Start);
    } else {
        start = moment(ServerDateTime, "YYYY-MM-DD").subtract(6, 'days');
    }
    if (End !== undefined && End !== null) {
        end = moment(End);
    } else {
        end = moment(ServerDateTime, "YYYY-MM-DD");
    }
    if (Label !== undefined && Label !== null) {
        label = Label;
    } else {
        label = 'Last 7 Days';
    }
    start1 = start;
    end1 = end;
    label1 = label;

    function cb(start, end, label) {
        start1 = start, end1 = end, label1 = label;
        if (/all|today/gi.test(label.toLowerCase())) {
            $('#reportrange').removeClass('filter-applied');
        } else {
            $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
        }

        /* if (label.toLowerCase() != 'all') {
            $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
        } else {
            $('#reportrange').removeClass('filter-applied');
        }
        if (label.toLowerCase() != 'today') {
            $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
        } else {
            $('#reportrange').removeClass('filter-applied');
        } */
        if (label == 'Custom Range') {
            $('#reportrange span').html(start.format('DD MMM YYYY') + ' - ' + end.format('DD MMM YYYY'));
        } else {
            $('#reportrange span').html(label);
        }
        // if (label == 'All') {
        $("#loader-wrapper").css("visibility", "visible");
        $("#loader").css("opacity", "0.9");
        setTimeout(function() {
            let node = null;
            if (document.querySelector('.reportselect')) {
                node = $(".reportselect option:selected").attr("data-report");
            } else if (document.querySelector('.list-group-item.active')) {
                // admin dashboard
                node = $(".list-group-item.active").attr("data-report");
            }
            if (node) {
                AG_GRID.SWIFT_REPORT(node);
            } else {
                //alert to user
            }
            $("#loader-wrapper").css("visibility", "hidden");
            $("#loader").css("opacity", "0");
        }, 100);
        /* } else {
            $("#loader-wrapper").css("visibility", "visible");
            $("#loader").css("opacity", "0.9");
            setTimeout(function() {
                //GetDashboardPackages(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                AG_GRID.SWIFT_REPORT($(".reportselect option:selected").attr("data-report"));
                $("#loader-wrapper").css("visibility", "hidden");
                $("#loader").css("opacity", "0");
            }, 100);
        } */
    }
    $('#reportrange').daterangepicker({
        startDate: start,
        endDate: end,
        maxDate: end,
        ranges: {
            'All': [moment(ServerDateTime, "YYYY-MM-DD").add(1, 'days'), moment(ServerDateTime, "YYYY-MM-DD").add(1, 'days')],
            'Today': [moment(ServerDateTime, "YYYY-MM-DD"), moment(ServerDateTime, "YYYY-MM-DD")],
            // 'Yesterday': [moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'days'), moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'days')],
            'Last 7 Days': [moment(ServerDateTime, "YYYY-MM-DD").subtract(6, 'days'), moment(ServerDateTime, "YYYY-MM-DD")],
            // 'Last 30 Days': [moment(ServerDateTime, "YYYY-MM-DD").subtract(29, 'days'), moment(ServerDateTime, "YYYY-MM-DD")],
            'This Month': [moment(ServerDateTime, "YYYY-MM-DD").startOf('month'), moment(ServerDateTime, "YYYY-MM-DD").endOf('month')],
            'Last Month': [moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'month').startOf('month'), moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'month').endOf('month')],
            'Last Three Month': [moment(ServerDateTime, "YYYY-MM-DD").subtract(3, 'month').startOf('month'), moment(ServerDateTime, "YYYY-MM-DD").subtract(3, 'month').endOf('month')]
        }
    }, cb);

    cb(start, end, label);
}
//07-08-2023
function changehandler(ele) {
    if ($(ele).val().trim().length > 0) {
        $('[data-report="SEARCH_DATA"]').removeAttr('disabled');
    } else {
        $('[data-report="SEARCH_DATA"]').attr('disabled', 'disabled');
    }
}