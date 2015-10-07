var jag = require("jag"),
	http = require("http"),
	sqlite3 = require('sqlite3').verbose(),
	fs = require("fs"),
	zip = require('node-zip'),
	_ = require("lodash");

var jsonPath = "../www/data/";
var imgPath = "/common/destiny_content/icons/";
var bungieURL = "http://www.bungie.net";
var manifestURL = "/Platform/Destiny/Manifest/";
var apikey = '5cae9cdee67a42848025223b4e61f929';
var neededFiles = [
	{ table: "DestinySandboxPerkDefinition", name: "perkDefs", key: "perkHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyInventoryItemDefinition", name: "itemDefs", key: "itemHash", reduce: function(item){
		var obj = item;
		obj.itemName = encodeURIComponent(obj.itemName);
		obj.tierTypeName = encodeURIComponent(obj.tierTypeName);
		obj.itemDescription = encodeURIComponent(obj.itemDescription);
		obj.itemTypeName = encodeURIComponent(obj.itemTypeName);
		//TODO use the information in obj.stats to supplement missing data in DestinyDB tooltips for min/max
		delete obj.stats;
		delete obj.hasAction;
		delete obj.instanced;
		delete obj.setItemHashes;
		delete obj.questlineItemHash;
		delete obj.objectiveHashes;
		delete obj.needsFullCompletion;
		delete obj.itemCategoryHashes;
		delete obj.itemIndex;
		delete obj.values;
		delete obj.sources;
		delete obj.itemLevels;
		delete obj.perkHashes;
		delete obj.sourceHashes;
		delete obj.equippingBlock;
		delete obj.exclusive;
		delete obj.actionName;
		delete obj.hasGeometry;
		delete obj.rewardItemHash;
		delete obj.primaryBaseStatHash;
		delete obj.nonTransferrable;
		delete obj.statGroupHash;
		delete obj.qualityLevel;
		delete obj.specialItemType;
		return obj;
	}},
	{ table: "DestinyTalentGridDefinition", name: "talentGridDefs", key: "gridHash", reduce: function(item){
		var obj = {};
		obj.nodes = _.map(item.nodes, function(node){
			return {
				nodeHash: node.nodeHash,
				steps: _.map(node.steps, function(step){
					return {
						icon: step.icon,
						nodeStepName: step.nodeStepName,
						nodeStepDescription: step.nodeStepDescription,
						perkHashes: step.perkHashes,
						activationRequirement: step.activationRequirement
					}
				})
			}
		});
		return obj;
	}},
	{ table: "DestinyRaceDefinition", name: "raceDefs", key: "raceHash", reduce: function(item){
		return item;
	}},
	{ table: "DestinyStatDefinition", name: "statDefs", key: "statHash", reduce: function(item){
		delete item.statDescription;
		delete item.icon;
		delete item.statIdentifier;
		delete item.interpolate;
		return item;
	}}/*,
	{ table: "DestinyProgressionDefinition", name: "progressDefs", key: "progressionHash", reduce: function(item){
		return item;
	}}*/,
	{ table: "DestinyObjectiveDefinition", name: "objectiveDefs", key: "objectiveHash", reduce: function(item){
		var obj = { objectiveHash: item.objectiveHash, completionValue: item.completionValue };
		return obj;
	}}
];

var downloadDatabase = function(callback){
	if ( fs.existsSync("mobileWorldContent_en.db") ){
		return callback();
	}
	var count = 0;
	var options = { method: 'GET', hostname: 'www.bungie.net', path: manifestURL, headers: { 'X-API-Key':  apikey } };
	console.log('making request ' + JSON.stringify(options));
	var req = http.request(options, function(res) {
		console.log("querying manifest");
		var data = []; // List of Buffer objects
		res.on("data", function(chunk) {
			data.push(chunk); // Append Buffer object
		});
		res.on("end", function() {
			var payload = JSON.parse(Buffer.concat(data));
			var languages = payload.Response.mobileWorldContentPaths;
			_.each(languages, function(link, locale){
				var mobileWorldContentPath = bungieURL + payload.Response.mobileWorldContentPaths[locale];
				count++;
				console.log("downloading mwcp in " + locale);
				http.get(mobileWorldContentPath, function(res) {
					var data = []; // List of Buffer objects
					res.on("data", function(chunk) {
						data.push(chunk); // Append Buffer object
					});
					res.on("end", function() {
						console.log("going to unzip file");
						var payload = Buffer.concat(data);
						var unzipped = new zip(payload, {base64: false, compression:'DEFLATE', checkCRC32: true});
						var fileName = Object.keys(unzipped.files)[0];
						console.log("unzipping " + fileName);
						fs.writeFileSync("mobileWorldContent_" +  locale + ".db", unzipped.files[fileName]._data, 'binary');
						count--;
						if (count == 0){
							callback();
						}
					});
				})
			});
		});
	});
	req.end();
}

var extractData = function(callback){
	var dbFiles = fs.readdirSync(".").filter(function(file){
		return file.indexOf("mobileWorldContent") > -1;
	});
	
	var count = 0;
	_.each(dbFiles, function(file){
		var locale = file.split("_")[1].split(".")[0];
		var db = new sqlite3.Database(file);
		neededFiles.forEach(function(set){
			count++;
			db.all("SELECT * FROM " + set.table, function(err, rows) {
				if (err) return; 
				var filename = set.name + ".json";
				var patchFile = set.name + ".patch";
				var obj = {};
				rows.forEach(function (row) {  
					var entry = JSON.parse(row.json);
					obj[entry[set.key]] = set.reduce(entry);
				});
				if (fs.existsSync(patchFile)){
					console.log("found patch file " + patchFile);
					var patchData = JSON.parse(fs.readFileSync(patchFile));
					_.extend(obj, patchData);
				}
				if (locale == "en"){
					console.log(locale +' writing file: ' + filename);
					fs.writeFileSync(jsonPath + filename, "_" + set.name + "="+JSON.stringify(obj));
				}
				else {
					var dataPath = "./locale/" + locale + "/";
					console.log(locale + ' saving file: ' + filename);
					if (!fs.existsSync(dataPath)){
						console.log(fs.existsSync(dataPath) + " creating new path: " + dataPath);
						fs.mkdirSync(dataPath);
					}					
					fs.writeFileSync(dataPath + filename, JSON.stringify(obj));				
					if (set.name == "itemDefs"){
						console.log(fs.existsSync(dataPath + filename) + " creating gz for " + locale);
						try {
							jag.pack(dataPath + filename,dataPath + filename+".gz", function(){
								//console.log("compressed");							
							});
						}catch(e){
							console.log("compress error");
						}
						
					}
				}
				count--;
				if (count == 0){
					callback();
				}
			});
		});	
		db.close();
	});
}
var queue = [];

var removeOrphans = function(callback){
	var files = fs.readdirSync(jsonPath + imgPath);
	var orphans = _.difference( files, queue );
	
	console.log("queue length: " + queue.length);
	console.log("orphans length: " + orphans.length);
	console.log("files length: " + files.length);
	
	_.each( orphans, function(file){
		fs.unlinkSync(jsonPath + imgPath + file);
	});
	callback();
}

var queueImages = function(callback){
	console.log("first queue");
	var contents = JSON.parse(fs.readFileSync(jsonPath + "itemDefs.json").toString("utf8").replace("_itemDefs=",""));
	_.each(contents, function(item){
		queue.push(item.icon.replace(imgPath,''));
		if (item.itemTypeName == "Emblem"){
			queue.push(item.secondaryIcon.replace(imgPath,''));
		}
	});
	console.log("2nd queue");
	contents = JSON.parse(fs.readFileSync(jsonPath + "perkDefs.json").toString("utf8").replace("_perkDefs=",""));
	_.each(contents, function(item){
		queue.push(item.displayIcon.replace(imgPath,''));
	});
	console.log("3rd queue");
	contents = JSON.parse(fs.readFileSync(jsonPath + "talentGridDefs.json").toString("utf8").replace("_talentGridDefs=",""));
	_.each(contents , function(tg){
		_.each(tg.nodes, function(node){
			_.each( node.steps, function(step){
				queue.push(step.icon.replace(imgPath,''));
			});
		});
	});
	console.log("callback queue: " + queue.length);
	queue = _.uniq(queue);
	console.log("callback queue: " + queue.length);
	callback();
}


var cacheIcons = function(){
	var icon = queue.pop();
	console.log("check if icon exists " + icon);
	var physicalPath = jsonPath + imgPath + icon;
	if ( !fs.existsSync(physicalPath) ){
		var dlPath = bungieURL + imgPath + icon;
		console.log("downloading icon " + dlPath);
		http.get(dlPath, function(res) {
			if (res.statusCode != 200){
				console.log(res.statusCode + " status code for icon " + icon);
				if (queue.length > 0)
					cacheIcons();
				return;
			}
			else {
				var data = []; // List of Buffer objects
				res.on("data", function(chunk) {
					data.push(chunk); // Append Buffer object
				});
				res.on("end", function() {
					fs.writeFileSync(physicalPath, Buffer.concat(data));
					if (queue.length > 0)
						cacheIcons();
				});			
			}
		});
	}
	else if (queue.length > 0){
		cacheIcons();
	}
}

downloadDatabase(function(){
	console.log("extracting data");
	extractData(function(){
		console.log("queuing images");
		queueImages(function(){
			console.log("removing orphans");
			removeOrphans(function(){
				console.log("caching icons");
				cacheIcons();
			});
		});
	});
});





