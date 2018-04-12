/**
 * ISC License

 * Copyright 2017 James Friend

 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
 * provided that the above copyright notice and this permission notice appear in all copies.

 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE
 * INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL,
 * DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
 * WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
 * ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import React from 'react';
import {StyleSheet, Text} from 'react-native';
import Parser from './htmlparser/Parser';
import DomHandler from './htmlparser/DomHandler';
import entities from 'entities';

const defaultOpts = {
  lineBreak: '\n',
  paragraphBreak: '\n\n',
  bullet: '\u2022 ',
  TextComponent: Text,
  textComponentProps: null,
  NodeComponent: Text,
  nodeComponentProps: null
};

export default function htmlToElement(rawHtml, customOpts = {}, done) {
  const opts = {
    ...defaultOpts,
    ...customOpts
  };

  function inheritedStyle(parent) {
    if (!parent) return null;
    const style = StyleSheet.flatten(opts.styles[parent.name]) || {};
    const parentStyle = inheritedStyle(parent.parent) || {};
    return {...parentStyle, ...style};
  }

  function domToElement(dom, parent) {
    if (!dom) return null;

    const renderNode = opts.customRenderer;
    let orderedListCounter = 1;

    return dom.map((node, index, list) => {
      if (renderNode) {
        const rendered = renderNode(node, index, list, parent, domToElement);
        if (rendered || rendered === null) return rendered;
      }

      const {TextComponent} = opts;

      if (node.type === 'text') {
        const defaultStyle = opts.textComponentProps
          ? opts.textComponentProps.style
          : null;
        const customStyle = inheritedStyle(parent);

        return (
          <TextComponent
            {...opts.textComponentProps}
            key={index}
            style={[defaultStyle, customStyle]}>
            {entities.decodeHTML(node.data)}
          </TextComponent>
        );
      }

      if (node.type === 'tag') {
        if (node.name === 'img') {
          // 暂时没有img标签
          return null;
        }

        let linkPressHandler = null;
        let linkLongPressHandler = null;
        if (node.name === 'a' && node.attribs && node.attribs.href) {
          linkPressHandler = () =>
            opts.linkHandler(entities.decodeHTML(node.attribs.href));
          if (opts.linkLongPressHandler) {
            linkLongPressHandler = () =>
              opts.linkLongPressHandler(entities.decodeHTML(node.attribs.href));
          }
        }

        let linebreakBefore = null;
        let linebreakAfter = null;
        if (opts.addLineBreaks) {
          switch (node.name) {
            case 'pre':
              linebreakBefore = opts.lineBreak;
              break;
            case 'p':
              if (index < list.length - 1) {
                linebreakAfter = opts.paragraphBreak;
              }
              break;
            case 'br':
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
              linebreakAfter = opts.lineBreak;
              break;
          }
        }

        let listItemPrefix = null;
        if (node.name === 'li') {
          const defaultStyle = opts.textComponentProps
            ? opts.textComponentProps.style
            : null;
          const customStyle = inheritedStyle(parent);

          if (parent.name === 'ol') {
            listItemPrefix = (
              <TextComponent style={[defaultStyle, customStyle]}>
                {`${orderedListCounter++}. `}
              </TextComponent>
            );
          } else if (parent.name === 'ul') {
            listItemPrefix = (
              <TextComponent style={[defaultStyle, customStyle]}>
                {opts.bullet}
              </TextComponent>
            );
          }
          if (opts.addLineBreaks && index < list.length - 1) {
            linebreakAfter = opts.lineBreak;
          }
        }

        const {NodeComponent, styles} = opts;

        return (
          <NodeComponent
            {...opts.nodeComponentProps}
            key={index}
            onPress={linkPressHandler}
            style={!node.parent ? styles[node.name] : null}
            onLongPress={linkLongPressHandler}>
            {linebreakBefore}
            {listItemPrefix}
            {domToElement(node.children, node)}
            {linebreakAfter}
          </NodeComponent>
        );
      }
    });
  }

  const handler = new DomHandler(function(err, dom) {
    if (err) done(err);
    done(null, domToElement(dom));
  });
  const parser = new Parser(handler);
  parser.write(rawHtml);
  parser.end();
}
