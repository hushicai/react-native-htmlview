/**
 * Copyright (c) Felix Böhm
 * All rights reserved.

 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 * THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING,
 * BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// This object will be used as the prototype for Nodes when creating a
// DOM-Level-1-compliant structure.
var DomNode = {
  get firstChild() {
    var children = this.children;
    return (children && children[0]) || null;
  },
  get lastChild() {
    var children = this.children;
    return (children && children[children.length - 1]) || null;
  },
  get nodeType() {
    return nodeTypes[this.type] || nodeTypes.element;
  }
};

var domLvl1 = {
  tagName: 'name',
  childNodes: 'children',
  parentNode: 'parent',
  previousSibling: 'prev',
  nextSibling: 'next',
  nodeValue: 'data'
};

var nodeTypes = {
  element: 1,
  text: 3,
  cdata: 4,
  comment: 8
};

Object.keys(domLvl1).forEach(function(key) {
  var shorthand = domLvl1[key];
  Object.defineProperty(DomNode, key, {
    get: function() {
      return this[shorthand] || null;
    },
    set: function(val) {
      this[shorthand] = val;
      return val;
    }
  });
});

export default DomNode;
