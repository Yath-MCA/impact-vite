var usernamedashboard = "";
usernamedashboard = localStorage.getItem('xmleditor:displayname');
$('#idname').text(usernamedashboard);

function screenaccessdeatails() {
	$('#R2,#R3').hide();
	$('#MAS01,#MAS02,#MAS03,#MAS04,#MAS05,#MAS06,#MAS07,#MAS08,#MAS08,#MAS09,#REP01,#REP02,#REP03').hide();

	var jsondata = { "tbl": "UserRights", "find": { "userid": localStorage.getItem('xmleditor:userid') }, "sort": {}, "filter": [] };
	console.log(jsondata);
	var url = API_PATH + "getdocsauth";
	commonfn['callajax'](jsondata, 'screenaccesslist', url);
}
//screenaccessdeatails();
$(document).ready(function () {
	commonfn['screenaccesslist'] = function (response) {
		console.log(response.data[0].screenlist);
		var permission = response.data[0].screenlist;
		var i = 0;
		jQuery.each(permission, function (i, val) {
			var test = val.screenid
			var read = val.read;
			var write = val.write;
			var none = val.none;
			if (read == "1") {
				$('#R2').show();
				$('#' + test).show();
				disabledall("read");
			} else if (write == "1") {
				$('#R2').show();
				$('#' + test).show();
			} else if (none == "1") {
				$('#R1').show();
				$('#' + test).hide();
			}
			i = i + 1;
		});
	};
});
function disabledall(test){
	if (test == "read") {
		$('#btn_newproject').attr("hidden", "hidden");
		$('#useraccessave').attr("hidden", "hidden");
		$('#usertablediv table').addClass('disabled');
	}
}