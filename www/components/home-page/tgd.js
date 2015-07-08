define(['knockout', "underscore"], function(ko, _){
	var tgd = {
		"DestinyViews": {
			"0": "All",
			"1": "Weapons",
			"2": "Armor",
			"3": "General"
		},
		"DestinyGender": {
			"0": "Male",
			"1": "Female"
		},
		"DestinyClass": {
			"0": "Titan",
			"1": "Hunter",
			"2": "Warlock",
			"3": "Unknown"
		},
		"DestinyDamageTypes": {
			"0": "None",
			"1": "Kinetic",
			"2": "Arc",
			"3": "Solar",
			"4": "Void",
			"5": "Raid"
		},
		"DestinyBucketTypes": {
			"12345": "Post Master",
			"14239492": "Chest",
			"20886954": "Boots",
			"284967655": "Ship",
			"375726501": "Mission",
			"953998645": "Heavy",
			"1469714392": "Consumables",
			"1498876634": "Primary",
			"1585787867": "Class Items",
			"2025709351": "Sparrow",
			"2197472680": "Bounties",
			"2465295065": "Special",
			"2973005342": "Shader",
			"3284755031": "Subclasses",
			"3448274439": "Helmet",
			"3551918588": "Gauntlet",
			"3865314626": "Materials",
			"4274335291": "Emblem"
		},
		"DestinyBucketColumns": {
			"Post Master": 4,
			"Chest": 3,
			"Boots": 3,
			"Ship": 3,
			"Heavy": 3,
			"Consumables": 4,
			"Primary": 3,
			"Class": 3,
			"Class Items": 3,
			"Sparrow": 3,
			"Special": 3,
			"Shader": 3,
			"Subclasses": 3,
			"Helmet": 3,
			"Gauntlet": 3,
			"Materials": 4,
			"Emblem": 3,
			"Bounties": 4,
			"Post": 4,
			"Mission": 4
		},
		"DestinyArmorPieces": [
			"Helmet",
			"Gauntlet",
			"Chest",
			"Boots",
			"Class Items"
		],
		"DestinyWeaponPieces": [
			"Primary",
			"Special",
			"Heavy"
		],
		"languages": [
			{
				"code": "en",
				"description": "English",
				"bungie_code": "en"
			},
			{
				"code": "es",
				"description": "Spanish",
				"bungie_code": "es"
			},
			{
				"code": "it",
				"description": "Italian",
				"bungie_code": "it"
			},
			{
				"code": "de",
				"description": "German",
				"bungie_code": "de"
			},
			{
				"code": "ja",
				"description": "Japanese",
				"bungie_code": "ja"
			},
			{
				"code": "pt",
				"description": "Portuguese",
				"bungie_code": "pt-br"
			},
			{
				"code": "fr",
				"description": "French",
				"bungie_code": "fr"
			}
		]
	};
	
	tgd.getStoredValue = function(key) {
		var saved = "";
		if (window.localStorage && window.localStorage.getItem)
			saved = window.localStorage.getItem(key);
		if (_.isEmpty(saved)) {
			return tgd.defaults[key];
		} else {
			return saved
		}
	}

	tgd.StoreObj = function(key, compare, writeCallback) {
		var value = ko.observable(compare ? tgd.getStoredValue(key) == compare : tgd.getStoredValue(key));
		this.read = function() {
			return value();
		}
		this.write = function(newValue) {
			window.localStorage.setItem(key, newValue);
			value(newValue);
			if (writeCallback) writeCallback(newValue);
		}
	}

	tgd.defaults = {
		searchKeyword: "",
		doRefresh: isMobile ? false : "true",
		refreshSeconds: 300,
		tierFilter: 0,
		typeFilter: 0,
		dmgFilter: [],
		activeView: 0,
		progressFilter: 0,
		showDuplicate: false,
		setFilter: [],
		shareView: false,
		shareUrl: "",
		showMissing: false,
		tooltipsEnabled: isMobile ? false : "true",
		autoTransferStacks: false,
		padBucketHeight: false,
		xsColumn: 12,
		smColumn: 6,
		mdColumn: 4,
		lgColumn: 3,
		//device and bungie locale
		locale: "en",
		//user interface set locale
		appLocale: "",
		//internally cached version of the itemDefs
		defsLocale: "en",
		//as of 2.7.0 I added versioning to itemDefs so the default would be this for everyone
		defLocaleVersion: "2.7.0",
		vaultPos: 0,
		itemDefs: "",
		defaultSystem: "2",
		preferredSystem: "",
		optionsPlatform: "2",
		inputEmail: "",
		inputPassword: "",
		rememberMe: ""
	};
	
	return tgd;
});