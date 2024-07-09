/*\
title: test/groups/stack.js
type: application/javascript
tags: $:/tags/test-spec

Tests the cyoa String-hashable Stack.

\*/

const utils = require("test/utils.js");

function testPremadeBook(wiki,expected) {
	var rtn = utils.testBookDefaultVar([],undefined,{wiki: wiki});
	expect(rtn.results).toEqual(expected);
	return rtn.state;
};

function node(name,parent,attributes) {
	var n = Object.assign({title: name},attributes);
	if(parent) { n["cyoa.imply"] = parent; }
	return n;
};

describe("Cyoa Stack",function() {

it("pushes and pops well enough",function() {
	var wiki = new $tw.Wiki();
	wiki.addTiddlers([
		utils.defaultGroup("stack",{"cyoa.serializer": "string"}),
		node("t A"),node("t\"B"),node("t'C"),
		{title: "Main",text: `
			<$cyoa touch="""[[t A]] [[t"B]]"""/>
			<$cyoa after="""[[t"B]]""" before="[[t A]]" reset='[[t"B]]' touch="t'C"/>`}]);
	var state = testPremadeBook(wiki,["t'C"]);
});

});
