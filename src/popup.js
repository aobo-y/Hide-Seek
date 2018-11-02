import $ from 'jquery';

import {
  getSettings,
  patchSettings
} from './lib/state';


var acc = $(".accordion");
var i;
for (i = 0; i < acc.length; i++) {
  acc[i].onclick = function() {
    this.classList.toggle("active");
    var panel = this.nextElementSibling;
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
    }
  }
}

var alertTime;
var fixedAlert = function(text, type) {
  $('#alert').html('<div class="alert alert-' + (type || 'success') + '">' + text + '</div>')
  if (alertTime) {
    clearTimeout(alertTime);
  }
  alertTime = setTimeout(function() {
    $('#alert').html('');
  }, 1500);
}

var renderSettings = function() {
  const settings = getSettings();
  // display current states
  $("#button1").prop('checked', settings.started);
  $("#button2").prop('checked', settings.rerank);
  $("#numcover").val(settings.numcover);
  $("#smlt_to").val(settings.smlt_to);

  if (!settings.started) {
    $("#button2").prop("disabled", true);
    $("#numcover").prop("disabled", true);
    $("#smlt_to").prop("disabled", true);
  } else {
    $("#button2").prop("disabled", false);
    $("#numcover").prop("disabled", false);
    $("#smlt_to").prop("disabled", false);
  }
}

$("#button1").change(function() {
  patchSettings({ started: this.checked });
  renderSettings();
})

$("#button2").change(function() {
  patchSettings({ rerank: this.checked });
  renderSettings();
})


$("#numcover").change(function() {
  var numcover = parseInt($("#numcover").val());
  if (numcover >= 2 && numcover <= 8) {
    patchSettings({ numcover });
    renderSettings();
  } else {
    fixedAlert("Setting out of bound!", "warning");
  }
})

$("#smlt_to").change(function() {
  var smlt = parseInt($("#smlt_to").val());
  if (smlt_to >= 10 && smlt_to <= 60) {
    patchSettings({ smlt_to });
    renderSettings();
  } else {
    fixedAlert("Setting out of bound!", "warning");
  }
})

renderSettings();
