/**
 * Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to
 deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 sell copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

import EventEmitter from 'eventemitter3';
import Tokenizer from './Tokenizer';

/*
	Options:
	xmlMode: Disables the special behavior for script/style tags (false by default)
	lowerCaseAttributeNames: call .toLowerCase for each attribute name (true if xmlMode is `false`)
	lowerCaseTags: call .toLowerCase for each tag name (true if xmlMode is `false`)
*/

/*
	Callbacks:
	oncdataend,
	oncdatastart,
	onclosetag,
	oncomment,
	oncommentend,
	onerror,
	onopentag,
	onprocessinginstruction,
	onreset,
	ontext
*/

var formTags = {
  input: true,
  option: true,
  optgroup: true,
  select: true,
  button: true,
  datalist: true,
  textarea: true
};

var openImpliesClose = {
  tr: {tr: true, th: true, td: true},
  th: {th: true},
  td: {thead: true, th: true, td: true},
  body: {head: true, link: true, script: true},
  li: {li: true},
  p: {p: true},
  h1: {p: true},
  h2: {p: true},
  h3: {p: true},
  h4: {p: true},
  h5: {p: true},
  h6: {p: true},
  select: formTags,
  input: formTags,
  output: formTags,
  button: formTags,
  datalist: formTags,
  textarea: formTags,
  option: {option: true},
  optgroup: {optgroup: true}
};

var voidElements = {
  __proto__: null,
  area: true,
  base: true,
  basefont: true,
  br: true,
  col: true,
  command: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  isindex: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,

  // common self closing svg elements
  path: true,
  circle: true,
  ellipse: true,
  line: true,
  rect: true,
  use: true,
  stop: true,
  polyline: true,
  polygon: true
};

var re_nameEnd = /\s|\//;

class Parser extends EventEmitter {
  constructor(cbs, options) {
    super();

    this._options = options || {};
    this._cbs = cbs || {};

    this._tagname = '';
    this._attribname = '';
    this._attribvalue = '';
    this._attribs = null;
    this._stack = [];

    this.startIndex = 0;
    this.endIndex = null;

    this._lowerCaseTagNames =
      'lowerCaseTags' in this._options
        ? !!this._options.lowerCaseTags
        : !this._options.xmlMode;
    this._lowerCaseAttributeNames =
      'lowerCaseAttributeNames' in this._options
        ? !!this._options.lowerCaseAttributeNames
        : !this._options.xmlMode;

    this._tokenizer = new Tokenizer(this._options, this);

    if (this._cbs.onparserinit) this._cbs.onparserinit(this);
  }

  _updatePosition = initialOffset => {
    if (this.endIndex === null) {
      if (this._tokenizer._sectionStart <= initialOffset) {
        this.startIndex = 0;
      } else {
        this.startIndex = this._tokenizer._sectionStart - initialOffset;
      }
    } else this.startIndex = this.endIndex + 1;
    this.endIndex = this._tokenizer.getAbsoluteIndex();
  };
  ontext = data => {
    this._updatePosition(1);
    this.endIndex--;

    if (this._cbs.ontext) this._cbs.ontext(data);
  };

  onopentagname = name => {
    if (this._lowerCaseTagNames) {
      name = name.toLowerCase();
    }

    this._tagname = name;

    if (!this._options.xmlMode && name in openImpliesClose) {
      for (
        var el;
        (el = this._stack[this._stack.length - 1]) in openImpliesClose[name];
        this.onclosetag(el)
      );
    }

    if (this._options.xmlMode || !(name in voidElements)) {
      this._stack.push(name);
    }

    if (this._cbs.onopentagname) this._cbs.onopentagname(name);
    if (this._cbs.onopentag) this._attribs = {};
  };

  onopentagend = () => {
    this._updatePosition(1);

    if (this._attribs) {
      if (this._cbs.onopentag)
        this._cbs.onopentag(this._tagname, this._attribs);
      this._attribs = null;
    }

    if (
      !this._options.xmlMode &&
      this._cbs.onclosetag &&
      this._tagname in voidElements
    ) {
      this._cbs.onclosetag(this._tagname);
    }

    this._tagname = '';
  };

  onclosetag = name => {
    this._updatePosition(1);

    if (this._lowerCaseTagNames) {
      name = name.toLowerCase();
    }

    if (
      this._stack.length &&
      (!(name in voidElements) || this._options.xmlMode)
    ) {
      var pos = this._stack.lastIndexOf(name);
      if (pos !== -1) {
        if (this._cbs.onclosetag) {
          pos = this._stack.length - pos;
          while (pos--) this._cbs.onclosetag(this._stack.pop());
        } else this._stack.length = pos;
      } else if (name === 'p' && !this._options.xmlMode) {
        this.onopentagname(name);
        this._closeCurrentTag();
      }
    } else if (!this._options.xmlMode && (name === 'br' || name === 'p')) {
      this.onopentagname(name);
      this._closeCurrentTag();
    }
  };

  onselfclosingtag = () => {
    if (this._options.xmlMode || this._options.recognizeSelfClosing) {
      this._closeCurrentTag();
    } else {
      this.onopentagend();
    }
  };

  _closeCurrentTag = () => {
    var name = this._tagname;

    this.onopentagend();

    // self-closing tags will be on the top of the stack
    // (cheaper check than in onclosetag)
    if (this._stack[this._stack.length - 1] === name) {
      if (this._cbs.onclosetag) {
        this._cbs.onclosetag(name);
      }
      this._stack.pop();
    }
  };

  onattribname = name => {
    if (this._lowerCaseAttributeNames) {
      name = name.toLowerCase();
    }
    this._attribname = name;
  };

  onattribdata = value => {
    this._attribvalue += value;
  };

  onattribend = () => {
    if (this._cbs.onattribute)
      this._cbs.onattribute(this._attribname, this._attribvalue);
    if (
      this._attribs &&
      !Object.prototype.hasOwnProperty.call(this._attribs, this._attribname)
    ) {
      this._attribs[this._attribname] = this._attribvalue;
    }
    this._attribname = '';
    this._attribvalue = '';
  };

  _getInstructionName = value => {
    var idx = value.search(re_nameEnd),
      name = idx < 0 ? value : value.substr(0, idx);

    if (this._lowerCaseTagNames) {
      name = name.toLowerCase();
    }

    return name;
  };

  ondeclaration = value => {
    if (this._cbs.onprocessinginstruction) {
      var name = this._getInstructionName(value);
      this._cbs.onprocessinginstruction('!' + name, '!' + value);
    }
  };

  onprocessinginstruction = value => {
    if (this._cbs.onprocessinginstruction) {
      var name = this._getInstructionName(value);
      this._cbs.onprocessinginstruction('?' + name, '?' + value);
    }
  };

  oncomment = value => {
    this._updatePosition(4);

    if (this._cbs.oncomment) this._cbs.oncomment(value);
    if (this._cbs.oncommentend) this._cbs.oncommentend();
  };

  oncdata = value => {
    this._updatePosition(1);

    if (this._options.xmlMode || this._options.recognizeCDATA) {
      if (this._cbs.oncdatastart) this._cbs.oncdatastart();
      if (this._cbs.ontext) this._cbs.ontext(value);
      if (this._cbs.oncdataend) this._cbs.oncdataend();
    } else {
      this.oncomment('[CDATA[' + value + ']]');
    }
  };

  onerror = function(err) {
    if (this._cbs.onerror) this._cbs.onerror(err);
  };

  onend = function() {
    if (this._cbs.onclosetag) {
      for (
        var i = this._stack.length;
        i > 0;
        this._cbs.onclosetag(this._stack[--i])
      );
    }
    if (this._cbs.onend) this._cbs.onend();
  };

  // Resets the parser to a blank state, ready to parse a new HTML document
  reset = () => {
    if (this._cbs.onreset) this._cbs.onreset();
    this._tokenizer.reset();

    this._tagname = '';
    this._attribname = '';
    this._attribs = null;
    this._stack = [];

    if (this._cbs.onparserinit) this._cbs.onparserinit(this);
  };

  // Parses a complete HTML document and pushes it to the handler
  parseComplete = data => {
    this.reset();
    this.end(data);
  };

  write = chunk => {
    this._tokenizer.write(chunk);
  };

  end = chunk => {
    this._tokenizer.end(chunk);
  };

  pause = () => {
    this._tokenizer.pause();
  };

  resume = () => {
    this._tokenizer.resume();
  };
}

export default Parser;
