/*\
title: $:/plugins/mythos/cyoa/js/widgets/cyoa.js
type: application/javascript
module-type: widget

State widget

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;
var utils = require("$:/plugins/mythos/cyoa/js/utils");
var snippets = require("$:/plugins/mythos/cyoa/js/snippets");

var CyoaWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

exports.cyoa = CyoaWidget;

/*
Inherit from the base widget class
*/
CyoaWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
CyoaWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	var domNode = this.createDomNode();
	parent.insertBefore(domNode,nextSibling);
	this.renderChildren(domNode,null);
	this.domNodes.push(domNode);
};

CyoaWidget.prototype.createDomNode = function() {
	var tag = this.getTag();
	var domNode = this.document.createElement(tag);
	if(this.id) domNode.setAttribute("id",this.id);
	domNode.className = this.getClassName();
	if(this.isLink() && tag === "a") {
		domNode.setAttribute("href",this.getLinkText());
	}
	var info = "";
	if(!this.hasVariable("cyoa-render","yes")) {
		// If we're just displaying in the project, and not rendering
		info = this.compileInfo();
		if(info.length > 0) {
			info = info.map(function(bit) {return bit.replace(/'/g,"\\'");});
			// \\a is a special kind of linebreak in css style strings.
			info = "--cyoa-info: '" + info.join("\\a ")  + "';";
		}
	}
	if(this.style || info) {
		info += this.style || "";
		domNode.setAttribute("style",info);
	}
	for(var i in this.customAttributes) {
		domNode.setAttribute(i,this.customAttributes[i]);
	}
	if(this["if"]) domNode.setAttribute("data-if",this["if"]);
	if(this["do"]) domNode.setAttribute("data-do",this["do"]);
	if(this["done"]) domNode.setAttribute("data-done",this["done"]);
	if(this.set) domNode.setAttribute("data-set",this.set);
	if(this.index) domNode.setAttribute("data-index",this.index);
	if(this.weight) domNode.setAttribute("data-weight",this.weight);
	if(this.hotkey) domNode.setAttribute("data-hotkey",this.hotkey);
	if(this.write) domNode.setAttribute("data-write",this.write);
	if(this.depends.length > 0) {
		domNode.setAttribute("data-depend",utils.encodePageForID(this.depends));
	}
	if(this.appends.length > 0) {
		domNode.setAttribute("data-append",utils.encodePageForID(this.appends));
	}
	return domNode;
};

CyoaWidget.prototype.compileInfo = function() {
	var array = [];
	function add(str) {
		if(str) {
			array.push.apply(array,str.split(";"));
		}
	}
	if(this.else) array.push("Else");
	add(this.if);
	if(this.depends.length > 0) {
		array.push("Depends on " + this.depends.join("' or '") + "");
	}
	if(this.index) {
		array.push("Index: " + this.index);
	}
	add(this.do);
	add(this.done);
	return array;
};

CyoaWidget.prototype.getClassName = function() {
	var classes = this["class"] ? this["class"].split(" ") : [];
	classes.push(this.page ? "cyoa-page" : "cyoa-state");
	if(this.else) { classes.push("cyoa-else"); }
	if(this["return"]) { classes.push("cyoa-return"); }
	if(this["replace"]) { classes.push("cyoa-replace"); }
	if(this["onclick"]) { classes.push("cyoa-onclick"); }
	if(this.isLink()) {
		classes.push("tc-tiddlylink");
		if(this.isShadow) {
			classes.push("tc-tiddlylink-shadow");
		}
		if(this.isMissing && !this.isShadow) {
			classes.push("tc-tiddlylink-missing");
		} else if(!this.isMissing) {
			classes.push("tc-tiddlylink-resolves");
		}
	}
	if(this.noscript) {
		// Class should be visible without the presence of javascript
		classes.push("cyoa-active");
	}
	return classes.join(" ");
}

CyoaWidget.prototype.isLink = function() {
	if((this.replace || this.to || this["return"]) && (["p","div","span"].indexOf((this.stateTag || "").toLowerCase()) == -1)) {
		var wikiLinksMacro = this.getVariable("tv-wikilinks");
		return wikiLinksMacro ? (wikiLinksMacro.trim() !== "no") : true;
	}
	return false;
};

CyoaWidget.prototype.getTag = function() {
	var tag = this.parseTreeNode.isBlock ? "div" : "span";
	if(this.isLink()) {
		tag = "a";
	}
	if(this.stateTag &&
	   $tw.config.htmlUnsafeElements.indexOf(this.stateTag) === -1) {
		tag = this.stateTag;
	}
	return tag;
}

CyoaWidget.prototype.hasChildren = function() {
	return (this.parseTreeNode.children && this.parseTreeNode.children.length > 0);
}

CyoaWidget.prototype.makeContentTemplate = function(title) {
	return [{
		type: "transclude",
		attributes: {
			"field": {type: "string",value: "cyoa.caption"},
			"tiddler": {type: "string",value: title}
		}
	}]
}

CyoaWidget.prototype.makeErrorChild = function(message) {
	return [{ type: "text",text: message}];
}

/*
I'm not sure if I should be using the wikiLinkTemplate macro. I should disable it somehow if this is cyoa rendering.
*/
CyoaWidget.prototype.getLinkText = function() {
	var encode = utils.encodePageForID;
	var wikiLinkTemplateMacro = this.getVariable("tv-wikilink-template");
	var wikiLinkTemplate = wikiLinkTemplateMacro ? wikiLinkTemplateMacro.trim() : "#$uri_encoded$";
	var wikiLinkText = wikiLinkTemplate.replace("$uri_encoded$",encode(this.to));
	wikiLinkText = wikiLinkText.replace("$uri_doubleencoded$",encode(encode(this.to)));
	wikiLinkText = this.getVariable("tv-get-export-link",{params: [{name: "to",value: this.defaultTo}],defaultValue: wikiLinkText});
	return wikiLinkText;
}

/*
Compute the internal state of the widget
*/
CyoaWidget.prototype.execute = function() {
	// Get parameters from our attributes
	var currentTiddler = this.getVariable("currentTiddler");
	var tiddler = this.wiki.getTiddler(currentTiddler);
	this.page =      this.getAttribute("page");
	this.customAttributes = Object.create(null);
	for(var i in this.attributes) {
		if(i.startsWith("$")) {
			this.customAttributes[i.substring(1)] = this.attributes[i];
		}
	}
	this.to =        this.getAttribute("to") || "";
	this.defaultTo = this.to || currentTiddler;
	this.depends =   snippets.getPageDependList(tiddler,this);
	this.appends =   snippets.getPageAppendList(tiddler,this);
	this.else =      this.getAttribute("else",this.else);
	this.noscript =  this.getAttribute("noscript");
	this["return"] = this.getAttribute("return");
	this["onclick"] =this.getAttribute("onclick");
	this["replace"] =this.getAttribute("replace");
	this.stateTag =  this.getAttribute("tag");
	this.weight =    this.getAttribute("weight");
	this.hotkey =    this.getAttribute("hotkey");
	this["class"] =  this.getAttribute("class");
	this.id =        this.getAttribute("id");
	this.style =     this.getAttribute("style");
	try {
		const ATTRS = ["if","do","done","set","write","index"];
		$tw.utils.each(ATTRS,(attribute) => {
			this[attribute] = snippets.getWidgetString(attribute,tiddler,this);
		});

		if(this.onclick || this.to) {
			this.isMissing = !this.wiki.tiddlerExists(this.defaultTo);
			this.isShadow = this.wiki.isShadowTiddler(this.defaultTo);
		}
	} catch (e) {
		if(this.hasVariable("cyoa-render","yes")) {
			// We're compiling, so we'll log a warning message and proceed as best we can.
			var ct = this.getVariable("currentTiddler");
			var message = "Error in tiddler '"+ct+"': "+e.message;
			utils.warn(message);
		} else {
			// We're in Tiddlywiki, so we'll replace the contents with a warning message so the user finds this fault quickly.
			this.makeChildWidgets(this.makeErrorChild(e.message));
			return;
		}
	}

	if(!this.hasChildren() && this.isLink()) {
		// Make up some children for this widget
		this.makeChildWidgets(this.makeContentTemplate(this.defaultTo));
	} else {
		// Construct whatever children it already has
		this.makeChildWidgets();
	}
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
CyoaWidget.prototype.refresh = function(changedTiddlers) {
	// c = changed attributes
	var c = this.computeAttributes();
	if(c.to || c.tag || c["class"] || c.id || c.style || c.weight || c.stateTag || c.noscript || c.replace) {
		this.refreshSelf();
		return true;
	} else {
		return this.refreshChildren(changedTiddlers);
	}
};

})();
