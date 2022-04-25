/*\
title: $:/plugins/mythos/cyoa/js/filters/group.js
type: application/javascript
module-type: cyoa.filteroperator

This gets information regarding cyoa groups. Whether incoming tiddlers are in one, or what groups there are, etc...

cyoa:group[] -> Passes all input whose group equals the parameter
cyoa:groups[] -> Ignores input. Returns all groups
cyoa:getgroup[] -> Returns dominantly-appended list of input tiddlers' groups
cyoa:grouphandlers[] -> Ignores input. Returns all group handlers
\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.group = function(source,operator,options) {
	const wiki = options.wiki;
	const group = (operator && operator.operand) || undefined;
	var results = [];
	if((operator.prefix === "!") === !!group) {
		source(function(tiddler,title) {
			if(wiki.getTiddlerCyoaGroup(title) !== group) {
				results.push(title);
			}
		});
	} else {
		source(function(tiddler,title) {
			if(wiki.getTiddlerCyoaGroup(title) === group) {
				results.push(title);
			}
		});
	}
	return results;
};

exports["var"] = function(source,operator,options) {
	var group = (operator && operator.operand) || options.wiki.getCyoaDefaultGroup();
	var tiddler = options.wiki.getCyoaGroups()[group];
	return tiddler ? [tiddler.fields.title] : [];
};

exports.groups = function(source,operator,options) {
	return Object.keys(options.wiki.getCyoaGroups());
};

exports.getgroup = function(source,operator,options) {
	var results = [];
	source(function(tiddler,title) {
		var group = options.wiki.getTiddlerCyoaGroup(title);
		if(group) {
			$tw.utils.pushTop(results,group);
		}
	});
	return results;
};

exports.grouphandlers = function(source,operator,options) {
	return options.wiki.getCyoaGroupHandlers();
};

})();
