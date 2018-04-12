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

/* eslint-disable react-native/no-unused-styles */

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import htmlToElement from './htmlToElement';
import {
  Linking,
  Platform,
  StyleSheet,
  View,
  ViewPropTypes,
  Text
} from 'react-native';

const boldStyle = {fontWeight: '500'};
const italicStyle = {fontStyle: 'italic'};
const underlineStyle = {textDecorationLine: 'underline'};
const codeStyle = {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'};

const baseStyles = StyleSheet.create({
  b: boldStyle,
  strong: boldStyle,
  i: italicStyle,
  em: italicStyle,
  u: underlineStyle,
  pre: codeStyle,
  code: codeStyle,
  a: {
    fontWeight: '500',
    color: '#007AFF'
  },
  h1: {fontWeight: '500', fontSize: 36},
  h2: {fontWeight: '500', fontSize: 30},
  h3: {fontWeight: '500', fontSize: 24},
  h4: {fontWeight: '500', fontSize: 18},
  h5: {fontWeight: '500', fontSize: 14},
  h6: {fontWeight: '500', fontSize: 12}
});

const htmlToElementOptKeys = [
  'lineBreak',
  'paragraphBreak',
  'bullet',
  'TextComponent',
  'textComponentProps',
  'NodeComponent',
  'nodeComponentProps'
];

class HtmlView extends PureComponent {
  constructor() {
    super();
    this.state = {
      element: null
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.startHtmlRender(this.props.value);
  }

  componentWillReceiveProps(nextProps) {
    if (
      this.props.value !== nextProps.value ||
      this.props.stylesheet !== nextProps.stylesheet ||
      this.props.textComponentProps !== nextProps.textComponentProps
    ) {
      this.startHtmlRender(
        nextProps.value,
        nextProps.stylesheet,
        nextProps.textComponentProps
      );
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  startHtmlRender(value, style, textComponentProps) {
    const {
      addLineBreaks,
      onLinkPress,
      onLinkLongPress,
      stylesheet,
      renderNode,
      onError
    } = this.props;

    if (!value) {
      this.setState({element: null});
    }

    const opts = {
      addLineBreaks,
      linkHandler: onLinkPress,
      linkLongPressHandler: onLinkLongPress,
      styles: {...baseStyles, ...stylesheet, ...style},
      customRenderer: renderNode
    };

    htmlToElementOptKeys.forEach(key => {
      if (typeof this.props[key] !== 'undefined') {
        opts[key] = this.props[key];
      }
    });

    if (textComponentProps) {
      opts.textComponentProps = textComponentProps;
    }

    htmlToElement(value, opts, (err, element) => {
      if (err) {
        onError(err);
      }

      if (this.mounted) {
        this.setState({element});
      }
    });
  }

  render() {
    const {RootComponent, style} = this.props;
    const {element} = this.state;
    if (element) {
      return (
        <RootComponent {...this.props.rootComponentProps} style={style}>
          {element}
        </RootComponent>
      );
    }
    return <RootComponent {...this.props.rootComponentProps} style={style} />;
  }
}

HtmlView.propTypes = {
  addLineBreaks: PropTypes.bool,
  bullet: PropTypes.string,
  lineBreak: PropTypes.string,
  NodeComponent: PropTypes.func,
  nodeComponentProps: PropTypes.object,
  onError: PropTypes.func,
  onLinkPress: PropTypes.func,
  onLinkLongPress: PropTypes.func,
  paragraphBreak: PropTypes.string,
  renderNode: PropTypes.func,
  RootComponent: PropTypes.func,
  rootComponentProps: PropTypes.object,
  style: PropTypes.oneOfType([ViewPropTypes.style, Text.propTypes.style]),
  stylesheet: PropTypes.object,
  TextComponent: PropTypes.func,
  textComponentProps: PropTypes.object,
  value: PropTypes.string
};

HtmlView.defaultProps = {
  addLineBreaks: true,
  onLinkPress: url => Linking.openURL(url),
  onLinkLongPress: null,
  onError: console.error.bind(console),
  RootComponent: View
};

export default HtmlView;
