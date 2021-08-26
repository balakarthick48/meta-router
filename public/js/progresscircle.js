function makesvg(percentage, inner_text = "") {
  var abs_percentage = Math.abs(percentage).toString();
  var percentage_str = "";
  percentage_str = percentage.toString();
  var classes = "";

  if (percentage < 0) {
    classes = "danger-stroke circle-chart__circle--negative";
  } else if (percentage > 0 && percentage <= 30) {
    classes = "warning-stroke";
  } else {
    classes = "success-stroke";
  }

  var svg =
    '<svg class="circle-chart" viewbox="0 0 33.83098862 33.83098862" xmlns="http://www.w3.org/2000/svg">' +
    '<circle class="circle-chart__background" cx="16.9" cy="16.9" r="13.9" />' +
    '<circle class="circle-chart__circle ' +
    classes +
    '"' +
    'stroke-dasharray="' +
    abs_percentage +
    ',100"    cx="16.9" cy="16.9" r="13.9" />' +
    '<g class="circle-chart__info">' +
    '   <text class="circle-chart__percent" x="17.9" y="15.5">' +
    percentage_str +
    "%</text>";

  if (inner_text) {
    var text =
      '<text class="circle-chart__subline" x="16.91549431" y="22">' +
      inner_text +
      "</text>";
    svg += text;
  }

  svg += " </g></svg>";

  return svg;
}

(function ($) {
  $.fn.circlechart = function (dataPercentage, SPFPercentage) {
    this.each(function () {
      var percentage = $(this).data("percentage");
      var inner_text = "";
      inner_text = $(this)
        .text()
        .replace(/\d+% ?/g, "");
      console.log(
        "Progress Circle ::: " +
          percentage +
          " ::: " +
          inner_text +
          " ::: " +
          dataPercentage
      );
      if (percentage != undefined) {
        console.log("percentage has value ::: ");
        $(this).html(makesvg(percentage, inner_text));
      } else if (dataPercentage != undefined) {
        console.log("percentage undefined ::: ");
        $(this).html(makesvg(dataPercentage, inner_text));
      }
      //makesvgforspfanddkim
      if (percentage == "") {
        console.log("SPF and DKIM has values ::: " + SPFPercentage);
        $(this).html(makesvg(SPFPercentage, inner_text));
      }
    });
    inner_text = "";
    return this;
  };
})(jQuery);
