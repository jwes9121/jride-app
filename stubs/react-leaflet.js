// Minimal no-op React components so imports succeed during build
const React = require('react');

function passthrough(tag) {
  return function Component(props) {
    const El = tag || 'div';
    return React.createElement(El, props, props.children);
  };
}

exports.MapContainer = passthrough('div');
exports.TileLayer = passthrough('div');
exports.Marker = passthrough('div');
exports.Popup = passthrough('div');
