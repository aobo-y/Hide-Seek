'use strict';

Highcharts.createElement('link', {
    href: 'https://fonts.googleapis.com/css?family=Dosis:400,600',
    rel: 'stylesheet',
    type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

var theme = Highcharts.theme = {
    colors: ['#7cb5ec', '#f7a35c', '#90ee7e', '#7798BF', '#aaeeee', '#ff0066', '#eeaaee',
        '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'
    ],
    chart: {
        backgroundColor: null,
        style: {
            fontFamily: 'Dosis, sans-serif'
        }
    },
    title: {
        style: {
            fontSize: '16px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        }
    },
    tooltip: {
        borderWidth: 0,
        backgroundColor: 'rgba(219,219,216,0.8)',
        shadow: false
    },
    legend: {
        itemStyle: {
            fontWeight: 'bold',
            fontSize: '13px'
        }
    },
    xAxis: {
        gridLineWidth: 1,
        labels: {
            style: {
                fontSize: '12px'
            }
        }
    },
    yAxis: {
        minorTickInterval: 'auto',
        title: {
            style: {
                textTransform: 'uppercase'
            }
        },
        labels: {
            style: {
                fontSize: '12px'
            }
        }
    },
    plotOptions: {
        candlestick: {
            lineColor: '#404048'
        }
    },
    // General
    background2: '#F0F0EA'
};

var bgp = chrome.extension.getBackgroundPage();
var userTopics = bgp.userTopics;
var generatedTopics = bgp.generatedTopics;

console.log(userTopics);
console.log(Object.keys(userTopics).length);

var removeUnderscore = function(string) {
    return string.replace(/_/g, ' ');
}

var parseFirstLevelTopic = function(datatype) {
    var arr = {};
    var keyword = "";
    $.each(datatype, function(key, value) {
        keyword = key.split("/")[1];
        if (arr.hasOwnProperty(keyword)) {
            arr[keyword] += value;
        } else {
            arr[keyword] = value;
        }
    })
    return arr;
}

var parseSecondLevelTopic = function(prev, datatype) {
    var arr = {};
    var curTopic = "";
    $.each(datatype, function(key, value) {
        if (key.split("/")[1] == prev) {
            curTopic = key.split("/")[2];
            if (arr.hasOwnProperty(curTopic)) {
                arr[curTopic] += value;
            } else {
                arr[curTopic] = value;
            }
        }
    })
    return arr;
}

var parseThirdLevelTopic = function(prev, datatype) {
    var arr = {};
    var curtopic = "";
    $.each(datatype, function(key, value) {
        if ((key.split("/")[1] + "-" + key.split("/")[2]) == prev) {
            curtopic = key.split("/")[3];
            if (arr.hasOwnProperty(curtopic)) {
                arr[curtopic] += value;
            } else {
                arr[curtopic] = value;
            }
        }
    })
    return arr;
}

var getSeries = function(datatype) {
    var arr = [];
    var data = [];
    if (datatype == "user") {
        $.each(parseFirstLevelTopic(userTopics), function(key, value) {
            console.log(key, value);
            data.push({ name: removeUnderscore(key), y: value, drilldown: key });
        })
        arr.push({ id: "toplevel", name: "Top-level Topics", data: data });
    } else if (datatype == "generated") {
        $.each(parseFirstLevelTopic(generatedTopics), function(key, value) {
            data.push({ name: removeUnderscore(key), y: value, drilldown: key });
        })
        arr.push({ id: "toplevel", name: "Top-level Topics", data: data });
    }
    return arr;
}

var getDrilldown = function(datatype) {
    var arr = [];
    var data = [];
    var data2 = [];
    if (datatype == "user") {
        $.each(parseFirstLevelTopic(userTopics), function(key, value) {
            data = [];
            $.each(parseSecondLevelTopic(key, userTopics), function(k, v) {
                data.push({ name: removeUnderscore(k), y: v, drilldown: key + "-" + k });
                data2 = [];
                console.log(parseThirdLevelTopic(key + "-" + k, userTopics));
                $.each(parseThirdLevelTopic(key + "-" + k, userTopics), function(kk, vv) {
                    data2.push({ name: removeUnderscore(kk), y: vv });
                })
                arr.push({ id: key + "-" + k, name: removeUnderscore(k), data: data2 });
            })
            arr.push({ id: key, name: removeUnderscore(key), data: data });
        });
    } else if (datatype == "generated") {
        $.each(parseFirstLevelTopic(generatedTopics), function(key, value) {
            data = [];
            $.each(parseSecondLevelTopic(key, generatedTopics), function(k, v) {
                data.push({ name: removeUnderscore(k), y: v, drilldown: key + "-" + k });
                data2 = [];
                $.each(parseThirdLevelTopic(key + "-" + k, generatedTopics), function(kk, vv) {
                    data2.push({ name: removeUnderscore(kk), y: vv });
                })
                arr.push({ id: key + "-" + k, name: removeUnderscore(k), data: data2 });
            })
            arr.push({ id: key, name: removeUnderscore(key), data: data });
        });
    }
    console.log(arr);
    return arr;
}

var userdata = {
    chart: {
        type: 'pie'
    },
    title: {
        text: "topic distribution of your queries."
    },
    subtitle: {
        text: 'Click the slices to view sub-topics.'
    },
    plotOptions: {
        series: {
            dataLabels: {
                enabled: true,
                format: '{point.name}: {point.y}'
            }
        }
    },
    tooltip: {
        headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
        pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b> time(s)<br/>'
    },
    series: getSeries("user"),
    drilldown: {
        series: getDrilldown("user")
    }
}

var generateddata = {
    chart: {
        type: 'pie'
    },
    title: {
        text: "topic distribution of generated queries."
    },
    subtitle: {
        text: 'Click the slices to view sub-topics.'
    },
    plotOptions: {
        series: {
            dataLabels: {
                enabled: true,
                format: '{point.name}: {point.y}'
            }
        }
    },
    tooltip: {
        headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
        pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b> time(s)<br/>'
    },
    series: getSeries("generated"),
    drilldown: {
        series: getDrilldown("generated")
    }
}

$(function() {
    $("#start-date").html(store.get('popupSettings').date.slice(0, 10));
    $("#user-id").html(store.get('popupSettings').uuid);
    if (Object.keys(userTopics).length > 0) {
        var chart1 = Highcharts.chart('container', Highcharts.merge(userdata, theme));
        var chart2 = Highcharts.chart('container2', Highcharts.merge(generateddata, theme));
    } else {
        alert("Make your first google search with Hide & Seek before checking reports!")
    }
});