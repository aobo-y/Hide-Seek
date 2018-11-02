import $ from 'jquery';
import store from 'store';

import {getSettings, patchSettings} from './lib/state';

const renderSettings = function() {
  const settings = getSettings();

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

var updateState = function() {
  renderSettings();
  $("#status").text("Settings saved!");
  setTimeout(function() {
    $("#status").text('');
  }, 1500);
}

$("#button1").change(function() {
  patchSettings({ started: this.checked });
  updateState();
})

$("#button2").change(function() {
  patchSettings({ rerank: this.checked });
  updateState();
})


$("#numcover").change(function() {
  var numcover = parseInt($("#numcover").val());
  if (numcover >= 2 && numcover <= 8) {
    patchSettings({ numcover });
    updateState();
  } else {
    $("#status").text("Setting out of bound!");
    setTimeout(function() {
      $("#status").text('');
    }, 1500);
  }
})

$("#smlt_to").change(function() {
  var smlt_to = parseInt($("#smlt_to").val());
  if (smlt_to >= 10 && smlt_to <= 60) {
    patchSettings({ smlt_to });

    updateState();
  } else {
    $("#status").text("Setting out of bound!");
    setTimeout(function() {
      $("#status").text('');
    }, 1500);
  }
})

renderSettings();
