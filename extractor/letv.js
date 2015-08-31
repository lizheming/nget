var util = require("../util/util.js");
var Url = require("url");
var md5 = require("md5");
var querystring = require("querystring");

var letv_download = function(url) {
	if( url.match(/http:\/\/yuntv.letv.com/) ) {
		letvcloud_download(url);
	} else {
		util.httpUtil.getHtml(url).then(function(html) {
			var vid = url.match(/http:\/\/www\.letv\.com\/ptv\/vplay\/(\d+).html/)[1] || html.match(/vid="(\d+)"/)[1];
			var title = html.match(/name="irTitle" content="(.*?)"/)[1];
			letv_download_by_vid(vid, title);
		})
	}
}

var letvcloud_download = function(url) {
	var paras = Url.parse(url).query;
	if( !paras.vu ) throw Error("Cannot get vu!");
	if( !paras.uu ) throw Error("Cannot get uu!");

	var title = "LETV-"+paras.vu;
	letvcloud_download_by_vu(paras.vu, paras.uu, title);
}

var letvcloud_download_by_vu = function(vu, uu, title) {
	var argument = {
		cf: "flash",
		format: "json",
		ran: Math.floor((new Date).getTime()/1000)+"",
		uu: uu+"",
		vu: vu+"",
		ver: "2.2"
	}, sign_key = "2f9d6924b33a165a6d8b5d3d42f4f987";
	var str2Hash = Object.keys(argument).sort().map(function(k) {
		return k + argument[k]
	}).join("") + sign_key;
	argument.sign = md5(str2Hash);
	var url = "http://api.letvcloud.com/gpc.php?"+querystring.stringify(argument);
	return util.httpUtil.getHtml(url).then(function(json) {
		if( typeof(json) === "string" ) json = JSON.parse(json);
		var type_available = [];
		for( video_type in json.data.video_info.media ) {
			type_available.push({
				video_url: info.data.video_info.media[video_type].play_url.main_url,
				video_quality: info.data.video_info.media[video_type].play_url.vtype
			})
		}
		return [atob(type_available.sort(function(a, b) {
			return a.video_quality - b.video_quality;
		})[-1].video_url)]
	})
}

var letv_download_by_vid = function(vid, title) {
	return video_info(vid, title).then(function(urls) {
		return urls;
	})
}

function video_info(vid, title) {
	var url = 'http://api.letv.com/mms/out/video/playJson';
	url += '?' + querystring.stringify({
		id: vid,
		platid: 1,
		splatid: 101,
		format: 1,
		tkey: calcTimeKey( Math.floor( new Date().getTime()/1000 ) ),
		domain: "www.letv.com"
	});
	console.log(url);

	return util.httpUtil.getHtml(url).then(function(json) {
		if( typeof(json) === "string" ) json = JSON.parse(json);

		var support_stream_id = Object.keys(json.playurl.dispatch),
			stream_id;

		if( support_stream_id.indexOf("1080p") > -1 ) stream_id = "1080p";
		else if( support_stream_id.indexOf("720p") > -1 ) stream_id = "720p";
		else stream_id = support_stream_id.sort()[-1];

		url = json.playurl.domain[0] + json.playurl.dispatch[stream_id][0]

		var ext = json.playurl.dispatch[stream_id][1].split(".")[-1];
		return url + "?" + querystring.stringify({
			ctv: "pc",
			m3v: 1,
			termid: 1,
			format: 1,
			hwtype: "un",
			ostype: "Linux",
			tag: "letv",
			sign: "letv",
			expect: 3,
			tn: Math.random(),
			pay: 0,
			iscpn: "f9051",
			rateid: stream_id
		})
	}).then(util.httpUtil.getHtml).then(function(json) {
		if( typeof(json) === "string" ) json = JSON.parse(json);
		return json.location
	}).then(util.httpUtil.getHtml).then(function(json) {
		json = decode(json);
		return json.match(/^[^#][^\r]*/g)
	});
}

function calcTimeKey(t) {
	function calc(v, r) {
		var a = new Binary(v);
		return (a.and(4294967295)>>>r%32) | (a.leftMove(32-r%32)&4294967295)
	}
	return calc( calc(t, 10)^773625421, 12 );
}

function Binary(number) {
	this.number = number;
	this.binary = this.number.toString(2);
}
Binary.prototype.leftMove = function(length）{
	return parseInt( this.binary+(new Array(length+1)).join(0), 2 );
}
Binary.prototype.and = function( bin ) {
	var a = this.binary.split("").reverse(),
		b = bin.binary.split("").reverse(),
		len = a.length - b.length ? b.length : a.length,
		res = [];
	for(var i = 0; i < len; i++) {
		res.push( (a[i]===b[i]&&a[i]==="")/1 );
	}
	return parseInt( res.reverse().join(""), 2 );
}
function decode(str) {
	var version = str.slice(0,5);
	if( version.toLowerCase() === "vc_01" ) {
		var loc2 = str.slice(5),
			len = loc2.length,
			loc4 = new Uint16Array( len*2 );

		for(var i=0,l=loc4.length;i<l;i++) {
			loc4[2*i] = loc2[i] >> 4;
			loc4[2*i+1] = loc2[i] & 15;
		}

		var loc6 = loc4.slice(loc4.length-11).concat( loc4.slice(0, loc4.length-11) );
		var loc7  = new Uint16Array(len);

		for(var i=0;i<len;i++) {
			loc7[i] = (loc6[2*i]<<4) + loc6[2*i+1];
		}
		return loc7.join("");
	} else return data;
}

module.exports = {
	letv_download: letv_download,
	letvcloud_download: letvcloud_download,
	letvcloud_download_by_vu: letvcloud_download_by_vu
}