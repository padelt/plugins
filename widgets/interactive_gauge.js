(function()
{

    freeboard.loadWidgetPlugin({
        "type_name"   : "interactive_gauge",
        "display_name": "Interactive Gauge",
        "description" : "Gauge with the ability to send a value as well as recieve one",
        "external_scripts" : [
            "plugins/thirdparty/raphael.2.1.0.min.js",
            "plugins/thirdparty/justgage.1.0.1.js"
        ],
        settings: [
            {
                name: "title",
                display_name: "Title",
                type: "text"
            },
            {
                name: "value",
                display_name: "Value",
                type: "calculated"
            },
            {
                name: "callback",
                display_name: "Datasource to send to",
                type: "calculated"
            },
            {
                name: "click_value",
                display_name: "Set Value on Click",
                type: "boolean",
                default_value: true
            },
            {
                name: "units",
                display_name: "Units",
                type: "text"
            },
            {
                name: "min_value",
                display_name: "Minimum",
                type: "text",
                default_value: 0
            },
            {
                name: "max_value",
                display_name: "Maximum",
                type: "text",
                default_value: 100
            }
        ],
        
        newInstance : function(settings, newInstanceCallback)
        {
            newInstanceCallback(new InteractiveGauge(settings));
        }
    });

    

    var gaugeID = 0;
    var InteractiveGauge = function(settings)
    {
        var self = this;

        var thisGaugeID = "igauge-" + gaugeID++;
        var titleElement = $('<h2 class="section-title"></h2>');
        var gaugeElement = $('<div class="gauge-widget" id="' + thisGaugeID + '"></div>');

        var gaugeObject;
        var rendered = false;

        var lastVal = 0
        var over = false

        var currentSettings = settings;

        function createGauge() {
            if (!rendered) {
                return;
            }

            gaugeElement.empty();

            gaugeObject = new JustGage({
                id: thisGaugeID,
                value: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                min: (_.isUndefined(currentSettings.min_value) ? 0 : currentSettings.min_value),
                max: (_.isUndefined(currentSettings.max_value) ? 0 : currentSettings.max_value),
                label: currentSettings.units,
                showInnerShadow: false,
                valueFontColor: "#d3d4d4"
            });

            $('path', gaugeElement).click(self.onClick.bind(self));
            $('path', gaugeElement).bind('mousemove', _.debounce(self.onHover.bind(self), 10));
            $('path', gaugeElement).bind('mouseover', self.mouseOver.bind(self));
            $('path', gaugeElement).bind('mouseout', self.mouseOut.bind(self));
            $('path', gaugeElement).css('cursor', 'pointer')

            self.addFilter();
        }


        function calcPosition(xin,yin) {
            var $path = $('path', gaugeElement)[0]

            var box = $path.getBBox()

            var x = xin - box.x
            var y = yin - box.y

            var xcent = box.width/2
            var ycent = box.height

            var dy = (ycent-y)
            var dx = (x-xcent)

            var angle = 180-Math.atan2(dy, dx)*(180/Math.PI)
            return (angle/180)*(currentSettings.max_value-currentSettings.min_value)+currentSettings.min_value 
        }

        this.onHover = function(e) {
            if (!over) return
            var val = calcPosition(e.offsetX, e.offsetY)
            gaugeObject.refresh(val.toFixed(1))
        }

        this.mouseOver = function(e) {
            over = true
            var path = $('path', gaugeElement)[0];
            path.setAttribute('filter', 'url(#glow)');
            
            $('text', gaugeElement)[0].setAttribute('fill', 'rgb(255,255,255)');
        },

        this.mouseOut = function(e) {
            over = false
            gaugeObject.refresh(lastVal)

            var path = $('path', gaugeElement)[0];
            path.setAttribute('filter', null);
            $('text', gaugeElement)[0].setAttribute('fill', 'rgb(211,212,212)');
        }


        this.onClick = function(e) {
            e.preventDefault();
            var val = calcPosition(e.offsetX, e.offsetY).toFixed(1)

            if (currentSettings.click_value) {
                gaugeObject.refresh(val)
                lastVal = val
            }

            this.mouseOut()
            this.sendValue(currentSettings.callback, val)
        }

        this.render = function (element) {
            rendered = true;
            $(element).append(titleElement).append($('<div class="gauge-widget-wrapper"></div>').append(gaugeElement));
            createGauge();
        }


        this.addFilter = function() {
            var gauge = $('defs', gaugeElement)[0]
            var filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
            filter.setAttribute("id","glow");

            var gaussianFilter = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
            gaussianFilter.setAttribute('stdDeviation', '2.5');
            gaussianFilter.setAttribute('result', 'coloredBlur');
            filter.appendChild(gaussianFilter);

            var feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
            filter.appendChild(feMerge);

            var feMergeNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNode.setAttribute('in', 'coloredBlur');
            feMerge.appendChild(feMergeNode);

            var feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNode2.setAttribute('in', 'SourceGraphic');
            feMerge.appendChild(feMergeNode2);

            gauge.appendChild(filter);
        }

        this.onSettingsChanged = function (newSettings) {
            if (newSettings.min_value != currentSettings.min_value || newSettings.max_value != currentSettings.max_value || newSettings.units != currentSettings.units) {
                currentSettings = newSettings;
                createGauge();
            }
            else {
                currentSettings = newSettings;
            }

            titleElement.html(newSettings.title);
        }

        this.onCalculatedValueChanged = function (settingName, newValue) {
            if (settingName != 'value') return;

            if (!_.isUndefined(gaugeObject)) {
                if (!over) gaugeObject.refresh(Number(newValue));
                lastVal = newValue
            }
        }

        this.onDispose = function () {
        }

        this.getHeight = function () {
            return 3;
        }

        this.onSettingsChanged(settings);


    }
}());