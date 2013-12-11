/*
 * Smouldering.js
 *
 * Copyright 2013, Karolis Grinkus - http://kartais.lt
 *
 * Github: https://github.com/makerspacelt/Smouldering.js
 */

(function ( undefined ) {

	'use strict';

	var Smouldering = Smouldering || function ( options ) {

		var colours = [
				'#FF4A34',
				'#FFD500',
				'#000000',
			],

			settings = {},

			points = [],

			ctx,

			height,

			width,

			Point = function () {

				this.vx = 0;
				this.vy = Math.random() * 10;
				this.x = width * Math.random();
				this.y = height * Math.random();
				this.radius = Math.floor( height / 10 * Math.random() ) + height / 5;
				this.damp = 100;
				this.theta = 0;
				this.rad = 3;
				this.colour = colours[ Math.floor( colours.length * Math.random() ) ];

				this.draw = function () {

					ctx.beginPath();
					ctx.arc( this.x, this.y, this.radius, 0, 2 * Math.PI, false );
					ctx.fillStyle = this.colour;
					ctx.fill();

				};

			},

			shapes = {
				mask: {
					draw: function () {
						ctx.beginPath();
						ctx.moveTo( width * 0.5, height * 0.5 );
						ctx.lineTo( width * 0.25, height * 0.5 * 1.618 );
						ctx.lineTo( width * 0.45, height * 0.475 * 1.618 );
						ctx.lineTo( width * 0.45, height );
						ctx.bezierCurveTo(
							width * 0.25, height,
							width * 0.1, height * 0.9,
							width * 0.05, height * 0.5 * 1.618
						);
						ctx.bezierCurveTo(
							0, height* 0.65,
							width * 0.3, height * 0.35 * 1.618,
							width * 0.2, height * 0.45
						);
						ctx.bezierCurveTo(
							width * 0.325, height * 0.525,
							width * 0.3, height * 0.6,
							width * 0.3, height * 0.6
						);
						ctx.bezierCurveTo(
							width * 0.55, height * 0.5 * 0.618,
							0, height * 0.5 * 0.618,
							width * 0.45, 0
						);
						ctx.bezierCurveTo(
							width * 0.25, height * 0.2,
							width * 0.4, height * 0.425,
							width * 0.55, height * 0.35
						);
						ctx.bezierCurveTo(
							width * 0.7, height * 0.25,
							width * 0.35, height * 0.25,
							width * 0.618, 0
						);
						ctx.bezierCurveTo(
							width * 0.45, height * 0.25,
							width * 0.875, height * 0.25,
							width * 0.7, height * 0.45
						);
						ctx.bezierCurveTo(
							width * 0.65, height * 0.5,
							width * 0.6, height * 0.7,
							width * 0.75, height * 0.618
						);
						ctx.bezierCurveTo(
							width * 0.85, height * 0.55,
							width * 0.7, height * 0.55,
							width * 0.9, height * 0.45
						);
						ctx.bezierCurveTo(
							width * 0.8, height * 0.55,
							width, height * 0.65,
							width * 0.9, height * 0.5 * 1.618
						);
						ctx.bezierCurveTo(
							width * 0.75, height,
							width * 0.618, height,
							width * 0.55, height
						);
						ctx.lineTo( width * 0.55, height * 0.475 * 1.618 );
						ctx.lineTo( width * 0.75, height * 0.5 * 1.618 );
						ctx.closePath();
					}
				}
			},

			drawBody = function () {

				var point,
					i;

				for ( i = points.length - 1; i >= 0; i-- ) {

					point = points[ i ];

					point.theta += Math.random() * 2 - 1;
					point.vx = ( point.rad * width / 3 * Math.cos( point.theta ) - point.vx ) / point.damp;
					point.vy += -Math.abs( point.rad * Math.sin( point.theta ) + point.vy ) / point.damp;
					point.x += point.vx;
					point.y += -Math.abs( point.vy );
					points[ i ].draw();

					if ( point.y < 0 - point.radius ) {
						point.vy = Math.random() * 10;
						point.y = height + point.radius;
					}

				}

			},

			draw = function () {

				ctx.clearRect( 0, 0, width, height );
				ctx.save();
				shapes.mask.draw();
				ctx.clip();

				drawBody();

				ctx.restore();

			},

			init = function ( options ) {

				var container = options.container,
					canvas,
					i;

				colours = options.colours || colours;

				height = container.offsetHeight;
				width = height / 1.618;

				settings = options;

				canvas = document.createElement('canvas');
				container.appendChild( canvas );
				canvas.height = height;
				canvas.width = width;

				settings.canvas = canvas;
				ctx = canvas.getContext('2d');

				for ( i = 40; i >= 0; i-- ) {
					points.push( new Point() );
				}

				(function animate( t ) {

					var time = t || 0;
					window.requestAnimationFrame( animate );

					draw();

				}());

			};

		init( options );

	};

	if ( typeof module !== 'undefined' && module.exports ) {
		module.exports = Smouldering;
	}

	if ( typeof ender === 'undefined' ) {
		this.Smouldering = Smouldering;
	}

	if ( typeof define === 'function' && define.amd ) {
		define('Smouldering', [], function () {
			return Smouldering;
		});
	}


}).call( this );