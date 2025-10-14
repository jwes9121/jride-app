const React = require('react');
const P = tag => (props) => React.createElement(tag || 'div', props, props.children);
exports.MapContainer = P('div');
exports.TileLayer = P('div');
exports.Marker = P('div');
exports.Tooltip = P('div');
exports.Popup = P('div');
exports.useMap = () => ({});
