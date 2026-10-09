var USER_CLIENT = localStorage.getItem('xmleditor:login_client_list');
// var ServerDateTime = "";
$(document).ready(function() {
    if (document.referrer == "" || document.referrer == window.location.href) {
        if(IS_LOCAL_HOST) return;
        window.location.href = "login.html";
    }
    if (!!USER_CLIENT) {
        var client = USER_CLIENT;
        if (USER_CLIENT.split(',').length > 1) {
            client = USER_CLIENT.split(',')[0];
            $.each(USER_CLIENT.split(','), function(item) {
                $('.clientselect').append($("<option />").val(this.toString()).html(this.toString().toUpperCase()));
            });
            $('.clientselect').show();
        }
        //appendCSS("../impactweb/assets/${{VERSION}}$/css/grid_"+client+".css");
    }
    ServerDateTime = new Date().toISOString().slice(0, 10);
    if ($(".reportselect").length > 0) {
        setTimeout(function() {
            daterange((new Date(Date.now() - (3600 * 1000 * 24 * 7))).toISOString().slice(0, 10), ServerDateTime, "Last 7 Days");
            $(".reportselect").val("FinalizedStatus").change();
        }, 3000);
    }
});

function appendCSS(path) {
    setTimeout(function() {
        var s = document.createElement("link");
        s.setAttribute("rel", "stylesheet");
        s.setAttribute("href", path);
        document.head.appendChild(s);
        console.log(s);
    }, 1000);
}

function removeCSSFile() {
    var linkNode = document.querySelector('link[href*="grid_"]');
    linkNode.parentNode.removeChild(linkNode);
}

function changeClient(e) {
    removeCSSFile();
    appendCSS("../impactweb/assets/${{VERSION}}$/css/grid_" + $('.clientselect').val() + ".css");
}

// function daterange(Start, End, Label) {
//     //var start = moment().subtract(29, 'days');
//     var start;
//     var end;
//     var label;
//     if (Start !== undefined && Start !== null) {
//         start = moment(Start);
//     } else {
//         start = moment(ServerDateTime, "YYYY-MM-DD").subtract(6, 'days');
//     }
//     if (End !== undefined && End !== null) {
//         end = moment(End);
//     } else {
//         end = moment(ServerDateTime, "YYYY-MM-DD");
//     }
//     if (Label !== undefined && Label !== null) {
//         label = Label;
//     } else {
//         label = 'Last 7 Days';
//     }
//     start1 = start;
//     end1 = end;
//     label1 = label;

//     function cb(start, end, label) {
//         start1 = start, end1 = end, label1 = label;
//         if (/all|today/gi.test(label.toLowerCase())) {
//             $('#reportrange').removeClass('filter-applied');
//         } else {
//             $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
//         }

//         /* if (label.toLowerCase() != 'all') {
//             $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
//         } else {
//             $('#reportrange').removeClass('filter-applied');
//         }
//         if (label.toLowerCase() != 'today') {
//             $('#reportrange').removeClass('filter-applied').addClass('filter-applied');
//         } else {
//             $('#reportrange').removeClass('filter-applied');
//         } */
//         if (label == 'Custom Range') {
//             $('#reportrange span').html(start.format('DD MMM YYYY') + ' - ' + end.format('DD MMM YYYY'));
//         } else {
//             $('#reportrange span').html(label);
//         }
//         // if (label == 'All') {
//         $("#loader-wrapper").css("visibility", "visible");
//         $("#loader").css("opacity", "0.9");
//         setTimeout(function() {
//             AG_GRID.SWIFT_REPORT($(".reportselect option:selected").attr("data-report"));
//             $("#loader-wrapper").css("visibility", "hidden");
//             $("#loader").css("opacity", "0");
//         }, 100);
//         /* } else {
//             $("#loader-wrapper").css("visibility", "visible");
//             $("#loader").css("opacity", "0.9");
//             setTimeout(function() {
//                 //GetDashboardPackages(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
//                 AG_GRID.SWIFT_REPORT($(".reportselect option:selected").attr("data-report"));
//                 $("#loader-wrapper").css("visibility", "hidden");
//                 $("#loader").css("opacity", "0");
//             }, 100);
//         } */
//     }
//     $('#reportrange').daterangepicker({
//         startDate: start,
//         endDate: end,
//         maxDate: end,
//         ranges: {
//             'All': [moment(ServerDateTime, "YYYY-MM-DD").add(1, 'days'), moment(ServerDateTime, "YYYY-MM-DD").add(1, 'days')],
//             'Today': [moment(ServerDateTime, "YYYY-MM-DD"), moment(ServerDateTime, "YYYY-MM-DD")],
//             'Yesterday': [moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'days'), moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'days')],
//             'Last 7 Days': [moment(ServerDateTime, "YYYY-MM-DD").subtract(6, 'days'), moment(ServerDateTime, "YYYY-MM-DD")],
//             'Last 30 Days': [moment(ServerDateTime, "YYYY-MM-DD").subtract(29, 'days'), moment(ServerDateTime, "YYYY-MM-DD")],
//             'This Month': [moment(ServerDateTime, "YYYY-MM-DD").startOf('month'), moment(ServerDateTime, "YYYY-MM-DD").endOf('month')],
//             'Last Month': [moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'month').startOf('month'), moment(ServerDateTime, "YYYY-MM-DD").subtract(1, 'month').endOf('month')]
//         }
//     }, cb);

//     cb(start, end, label);
// }
// //07-08-2023
// function changehandler(ele) {
//     if ($(ele).val().trim().length > 0) {
//         $('[data-report="SEARCH_DATA"]').removeAttr('disabled');
//     } else {
//         $('[data-report="SEARCH_DATA"]').attr('disabled', 'disabled');
//     }
// }