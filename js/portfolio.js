var EaseScroll;
(function (EaseScroll) {
    var Scroll = (function () {
        function Scroll() {
        }
        Scroll.move = function (goal, timeToArrive) {
            var now = Date.now();
            var timeLeft = timeToArrive - now;
            // Out of time
            if (timeLeft <= Scroll.stepTime) {
                window.scroll(0, goal);
                return;
            }
            var distanceToMove = goal - window.pageYOffset;
            var stepsRemaining = (timeToArrive - now) / Scroll.stepTime;
            var distanceToMoveThisStep = distanceToMove / stepsRemaining;
            window.scroll(0, window.pageYOffset + distanceToMoveThisStep);
            window.setTimeout(Scroll.move, Scroll.stepTime, goal, timeToArrive);
        };
        Scroll.to = function (elementId, milliseconds) {
            var goal = document.getElementById(elementId).offsetTop;
            var timeToArrive = Date.now() + milliseconds;
            window.setTimeout(Scroll.move, Scroll.stepTime, goal, timeToArrive);
        };
        Scroll.stepTime = 10;
        return Scroll;
    }());
    EaseScroll.Scroll = Scroll;
})(EaseScroll || (EaseScroll = {}));
var WordCloud;
(function (WordCloud) {
    var Position = (function () {
        function Position(x, y) {
            if (typeof x == 'undefined') {
                x = 0;
                y = 0;
            }
            if (x instanceof Position) {
                y = x.y;
                x = x.x;
            }
            this.x = x;
            this.y = y;
        }
        return Position;
    }());
    WordCloud.Position = Position;
})(WordCloud || (WordCloud = {}));
/// <reference path="Position.ts" />
var WordCloud;
(function (WordCloud) {
    var RingPosition = (function () {
        function RingPosition(position) {
            this.initialPosition = position;
            this.step = 0;
        }
        /**
         * How many pixels wide is the current ring
         * @param {int} ring
         * @returns {int}
         */
        RingPosition.diameterOfRing = function (ring) {
            if (ring < 0) {
                return 0;
            }
            return (ring * 2) + 1;
        };
        /**
         * Which ring does the current step reside in
         * @param {int} step
         * @returns {int}
         */
        RingPosition.whichRing = function (step) {
            var squareRoot = Math.floor(Math.sqrt(step));
            return Math.ceil(squareRoot / 2);
        };
        /**
         * Returns all steps needed to have gone through before arriving on the
         * current ring
         * @param {int} ring
         * @returns {int}
         */
        RingPosition.stepsInRingInclusive = function (ring) {
            var width = RingPosition.diameterOfRing(ring);
            return width * width;
        };
        /**
         * This works out what step along the ring we are, but does not tell you
         * if that step is on the ring in the first place.
         * @param {int} step
         * @param {int} ring
         * @returns {int}
         */
        RingPosition.stepOnRing = function (step, ring) {
            return step - RingPosition.stepsInRingInclusive(ring - 1);
        };
        /**
         * For the given step, work out what the position on the ring is
         * @param step
         * @returns {WordCloud.Position}
         */
        RingPosition.prototype.positionOnRing = function (step) {
            var ring = RingPosition.whichRing(step);
            var diameter = RingPosition.diameterOfRing(ring);
            var currentStepOnRing = RingPosition.stepOnRing(step, ring);
            var position = new WordCloud.Position(this.initialPosition);
            position.x -= ring;
            position.y -= ring;
            // From top left corner, go around in a circle
            // 0 1 2 3 4    0 1 2 3 0
            // 6 0 1 2 5    3 0 1 0 1
            // 5 7 0 3 7    2 1 0 1 2
            // 4 6 5 4 8    1 0 1 0 3
            // 3 2 1 0 9    0 3 2 1 0
            // diameter = 5
            var smallDiameter = diameter - 1;
            var normaliseStep = smallDiameter == 0 ? 0 : currentStepOnRing % smallDiameter;
            // Left side
            if (currentStepOnRing >= 3 * smallDiameter) {
                position.y += smallDiameter - normaliseStep;
            }
            else if (currentStepOnRing >= 2 * smallDiameter) {
                position.x += smallDiameter - normaliseStep;
                position.y += smallDiameter;
            }
            else if (currentStepOnRing >= smallDiameter) {
                position.x += smallDiameter;
                position.y += normaliseStep;
            }
            else {
                position.x += normaliseStep;
            }
            return position;
        };
        RingPosition.prototype.nextPosition = function () {
            return this.positionOnRing(this.step++);
        };
        return RingPosition;
    }());
    WordCloud.RingPosition = RingPosition;
})(WordCloud || (WordCloud = {}));
/// <reference path="RingPosition.ts" />
/// <reference path="Position.ts" />
/// <reference path="Interpolate.ts" />
var WordCloud;
(function (WordCloud) {
    var Cloud = (function () {
        function Cloud(elementId) {
            this.cloudElement = document.getElementById(elementId);
            if (!this.cloudElement) {
                throw new RangeError('elementId is not the id of a valid element');
            }
            // Defaults
            this.maxFontSize = 2;
            this.minFontSize = 0.5;
            Cloud.prepareCloudElement(this.cloudElement, this.cloudElement.offsetWidth, this.cloudElement.offsetHeight);
        }
        Cloud.positionElement = function (element, position) {
            element.style.top = (position.y + (element.offsetHeight / 2)) + 'px';
            element.style.left = (position.x - (element.offsetWidth / 2)) + 'px';
        };
        /**
         * Tests if one rectangle is fully inside another rectangle.
         * This is used to test the cloud puff as still inside the cloud element.
         * @param inner {ClientRect}
         * @param outer {ClientRect}
         * @returns {boolean}
         */
        Cloud.isRectFullyInsideRect = function (inner, outer) {
            return inner.left >= outer.left
                && inner.right <= outer.right
                && inner.top >= outer.top
                && inner.bottom <= outer.bottom;
        };
        /**
         * Test if one rect is touching any other rect.
         * This is used to prevent cloud puffs from touching.
         * @param testRect {ClientRect}
         * @param rectList {ClientRect}
         * @returns {boolean}
         */
        Cloud.doesRectCollideWithRects = function (testRect, rectList) {
            for (var index in rectList) {
                if (rectList.hasOwnProperty(index)) {
                    if (Cloud.doesRectCollideWithRect(testRect, rectList[index])) {
                        return true;
                    }
                }
            }
            return false;
        };
        /**
         * Tests if a single rect collides with another single rect.
         * @param rect1 {ClientRect}
         * @param rect2 {ClientRect}
         * @returns {boolean}
         */
        Cloud.doesRectCollideWithRect = function (rect1, rect2) {
            return !(rect1.right < rect2.left
                || rect1.left > rect2.right
                || rect1.bottom < rect2.top
                || rect1.top > rect2.bottom);
        };
        /**
         * Prepare the style for the cloud element as a whole
         * @param cloudElement
         * @param width
         * @param height
         */
        Cloud.prepareCloudElement = function (cloudElement, width, height) {
            cloudElement.style.position = 'relative';
            cloudElement.style.width = width + 'px';
            cloudElement.style.height = height + 'px';
        };
        /**
         * Prepare the style for each cloud puff.
         * @param cloudElement
         * @param interpolate
         * @param minFontSize
         * @param maxFontSize
         */
        Cloud.prepareCloudPuffs = function (cloudElement, interpolate, minFontSize, maxFontSize) {
            for (var index = 0; index < cloudElement.children.length; index++) {
                // This needs casting
                var child = cloudElement.children[index];
                var fontSize = interpolate(cloudElement.children.length, index, minFontSize, maxFontSize);
                child.style.fontSize = fontSize + 'rem';
                child.style.display = 'none';
                child.style.position = 'absolute';
                child.style.padding = '3px';
            }
        };
        /**
         * Position each cloud puff
         * @param cloudElement {HTMLElement}
         * @param width {number}
         * @param height {number}
         */
        Cloud.positionCloudPuffs = function (cloudElement, width, height) {
            var positionedRects = [];
            everything: for (var index = 0; index < cloudElement.children.length; index++) {
                var ring = new WordCloud.RingPosition(new WordCloud.Position(width / 2, height / 2));
                var child = cloudElement.children[index];
                child.style.display = 'inline-block';
                var childRect = child.getBoundingClientRect();
                var nextPosition = ring.nextPosition();
                var testRect = Cloud.translateRect(childRect, nextPosition);
                while (Cloud.doesRectCollideWithRects(testRect, positionedRects)) {
                    if (!Cloud.isRectFullyInsideRect(testRect, cloudElement.getBoundingClientRect())) {
                        child.style.display = 'none';
                        break everything;
                    }
                    nextPosition = ring.nextPosition();
                    testRect = Cloud.translateRect(childRect, nextPosition);
                }
                Cloud.positionElement(child, nextPosition);
                positionedRects.push(testRect);
            }
        };
        /**
         * |
         * |      *
         * |  *
         * |________
         *
         * @param rect {ClientRect}
         * @param position {Position}
         * @returns {ClientRect}
         */
        Cloud.translateRect = function (rect, position) {
            var currentPosition = new WordCloud.Position(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
            var translation = new WordCloud.Position(position.x - position.x, position.y - currentPosition.y);
            return {
                bottom: rect.bottom + translation.y,
                top: rect.top + translation.y,
                left: rect.left + translation.x,
                right: rect.right + translation.x,
                height: null,
                width: null
            };
        };
        /**
         * A simple linear interpolations
         * @param steps {number}
         * @param step {number}
         * @param start {number}
         * @param finish {number}
         * @returns {number}
         */
        Cloud.defaultInterpolate = function (steps, step, start, finish) {
            var range = finish - start;
            var stepSize = range / steps;
            var remaining = steps - step;
            return (stepSize * remaining) + start;
        };
        ;
        /**
         * Works out the highest point in the cloud
         * @param cloudElement
         * @returns {number}
         */
        Cloud.getHighestPoint = function (cloudElement) {
            var highestPoint = cloudElement.offsetHeight;
            for (var index = 0; index < cloudElement.children.length; index++) {
                var child = cloudElement.children[index];
                var top_1 = parseInt(child.style.top);
                if (top_1 < highestPoint) {
                    highestPoint = top_1;
                }
            }
            return highestPoint;
        };
        /**
         * Works out the lowest point in the cloud
         * @param cloudElement
         * @returns {number}
         */
        Cloud.getLowestPoint = function (cloudElement) {
            var lowestPoint = 0;
            for (var index = 0; index < cloudElement.children.length; index++) {
                var child = cloudElement.children[index];
                var bottom = parseInt(child.style.top) + child.offsetHeight;
                if (bottom > lowestPoint) {
                    lowestPoint = bottom;
                }
            }
            return lowestPoint;
        };
        /**
         * Gets the internal bounding area for the cloud
         * @param cloudElement HTMLElement
         * @returns {ClientRect}
         */
        Cloud.getBoundingRect = function (cloudElement) {
            var rect = {
                bottom: 0,
                top: 0,
                left: 0,
                right: 0,
                height: 0,
                width: 0
            };
            for (var index = 0; index < cloudElement.children.length; index++) {
                var child = cloudElement.children[index];
                var bottom = child.offsetTop + child.offsetHeight;
                var top_2 = child.offsetTop;
                var left = child.offsetLeft;
                var right = child.offsetLeft + child.offsetWidth;
                if (bottom > rect.bottom) {
                    rect.bottom = bottom;
                }
                if (top_2 < rect.top) {
                    rect.top = top_2;
                }
                if (left > rect.left) {
                    rect.left = left;
                }
                if (right < rect.right) {
                    rect.right = right;
                }
            }
            rect.width = rect.right - rect.left;
            rect.height = rect.bottom - rect.top;
            return rect;
        };
        Cloud.shufflePuffsUp = function (cloudElement) {
            var delta = Cloud.getHighestPoint(cloudElement);
            for (var index = 0; index < cloudElement.children.length; index++) {
                var child = cloudElement.children[index];
                var currentTop = parseInt(child.style.top);
                child.style.top = (currentTop - delta) + 'px';
            }
        };
        Cloud.prototype.create = function () {
            Cloud.prepareCloudPuffs(this.cloudElement, Cloud.defaultInterpolate, this.minFontSize, this.maxFontSize);
            Cloud.positionCloudPuffs(this.cloudElement, this.cloudElement.offsetWidth, this.cloudElement.offsetHeight);
            Cloud.shufflePuffsUp(this.cloudElement);
            this.cloudElement.style.width = null;
            this.cloudElement.style.height = Cloud.getLowestPoint(this.cloudElement) + "px";
        };
        return Cloud;
    }());
    WordCloud.Cloud = Cloud;
})(WordCloud || (WordCloud = {}));
