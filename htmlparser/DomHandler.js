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

import DomNode from './DomNode';

/**
 * 自定义节点类型
 */
const Type = {
  Text: 'text', // Text
  Directive: 'directive', // <? ... ?>
  Comment: 'comment', // <!-- ... -->
  Script: 'script', // <script> tags
  Style: 'style', // <style> tags
  Tag: 'tag', // Any tag
  CDATA: 'cdata', // <![CDATA[ ... ]]>
  Doctype: 'doctype'
};

const re_whitespace = /\s+/g;

function DomHandler(callback, options, elementCB) {
  if (typeof callback === 'object') {
    elementCB = options;
    options = callback;
    callback = null;
  } else if (typeof options === 'function') {
    elementCB = options;
    options = defaultOpts;
  }
  this._callback = callback;
  this._options = options || defaultOpts;
  this._elementCB = elementCB;
  this.dom = [];
  this._done = false;
  this._tagStack = [];
  this._parser = this._parser || null;
}

// default options
var defaultOpts = {
  normalizeWhitespace: false, // Replace all whitespace with single spaces
  withStartIndices: false, // Add startIndex properties to nodes
  withEndIndices: false // Add endIndex properties to nodes
};

DomHandler.prototype.onparserinit = function(parser) {
  this._parser = parser;
};

// Resets the handler back to starting state
DomHandler.prototype.onreset = function() {
  DomHandler.call(this, this._callback, this._options, this._elementCB);
};

// Signals the handler that parsing is done
DomHandler.prototype.onend = function() {
  if (this._done) return;
  this._done = true;
  this._parser = null;
  this._handleCallback(null);
};

DomHandler.prototype._handleCallback = DomHandler.prototype.onerror = function(
  error
) {
  if (typeof this._callback === 'function') {
    this._callback(error, this.dom);
  } else {
    if (error) throw error;
  }
};

DomHandler.prototype.onclosetag = function() {
  // if(this._tagStack.pop().name !== name) this._handleCallback(Error("Tagname didn't match!"));

  var elem = this._tagStack.pop();

  if (this._options.withEndIndices) {
    elem.endIndex = this._parser.endIndex;
  }

  if (this._elementCB) this._elementCB(elem);
};

DomHandler.prototype._createDomElement = function(properties) {
  if (!this._options.withDomLvl1) return properties;

  var element = Object.create(DomNode);

  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      element[key] = properties[key];
    }
  }

  return element;
};

DomHandler.prototype._addDomElement = function(element) {
  var parent = this._tagStack[this._tagStack.length - 1];
  var siblings = parent ? parent.children : this.dom;
  var previousSibling = siblings[siblings.length - 1];

  element.next = null;

  if (this._options.withStartIndices) {
    element.startIndex = this._parser.startIndex;
  }
  if (this._options.withEndIndices) {
    element.endIndex = this._parser.endIndex;
  }

  if (previousSibling) {
    element.prev = previousSibling;
    previousSibling.next = element;
  } else {
    element.prev = null;
  }

  siblings.push(element);
  element.parent = parent || null;
};

DomHandler.prototype.onopentag = function(name, attribs) {
  var properties = {
    type:
      name === 'script'
        ? Type.Script
        : name === 'style' ? Type.Style : Type.Tag,
    name: name,
    attribs: attribs,
    children: []
  };

  var element = this._createDomElement(properties);

  this._addDomElement(element);

  this._tagStack.push(element);
};

DomHandler.prototype.ontext = function(data) {
  // the ignoreWhitespace is officially dropped, but for now,
  // it's an alias for normalizeWhitespace
  var normalize =
    this._options.normalizeWhitespace || this._options.ignoreWhitespace;

  var lastTag;

  if (
    !this._tagStack.length &&
    this.dom.length &&
    (lastTag = this.dom[this.dom.length - 1]).type === Type.Text
  ) {
    if (normalize) {
      lastTag.data = (lastTag.data + data).replace(re_whitespace, ' ');
    } else {
      lastTag.data += data;
    }
  } else {
    if (
      this._tagStack.length &&
      (lastTag = this._tagStack[this._tagStack.length - 1]) &&
      (lastTag = lastTag.children[lastTag.children.length - 1]) &&
      lastTag.type === Type.Text
    ) {
      if (normalize) {
        lastTag.data = (lastTag.data + data).replace(re_whitespace, ' ');
      } else {
        lastTag.data += data;
      }
    } else {
      if (normalize) {
        data = data.replace(re_whitespace, ' ');
      }

      var element = this._createDomElement({
        data: data,
        type: Type.Text
      });

      this._addDomElement(element);
    }
  }
};

DomHandler.prototype.oncomment = function(data) {
  var lastTag = this._tagStack[this._tagStack.length - 1];

  if (lastTag && lastTag.type === Type.Comment) {
    lastTag.data += data;
    return;
  }

  var properties = {
    data: data,
    type: Type.Comment
  };

  var element = this._createDomElement(properties);

  this._addDomElement(element);
  this._tagStack.push(element);
};

DomHandler.prototype.oncdatastart = function() {
  var properties = {
    children: [
      {
        data: '',
        type: Type.Text
      }
    ],
    type: Type.CDATA
  };

  var element = this._createDomElement(properties);

  this._addDomElement(element);
  this._tagStack.push(element);
};

DomHandler.prototype.oncommentend = DomHandler.prototype.oncdataend = function() {
  this._tagStack.pop();
};

DomHandler.prototype.onprocessinginstruction = function(name, data) {
  var element = this._createDomElement({
    name: name,
    data: data,
    type: Type.Directive
  });

  this._addDomElement(element);
};

module.exports = DomHandler;
