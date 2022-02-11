"use strict";
setChart();
async function setChart() {
  showLoading();
  const data = await fetchLivingData();
  console.log("get data res:", data);
  if (!data) {
    hideLoading();
    showErrorMsg();
    return;
  }
  const livingRawData = data.result.records;
  const taipeiDistricts = arrangeTaipeiDistricts(livingRawData);
  setDistrictDropdown(taipeiDistricts);
  const arrangedTaipeiLivingData = arrangeTaipeiLivingData(livingRawData);
  saveDataIntoSessionStorage(arrangedTaipeiLivingData);
  const currentDistrict = getCurrentSelectDistrict();
  const { maleArr, femaleArr } = getSingleDistrictLivingData(currentDistrict);
  const ctx = document.getElementById("barChart");
  const barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["共同生活戶", "獨立生活戶"],
      datasets: [
        {
          label: "男",
          backgroundColor: "#61c1c1",
          borderWidth: 1,
          data: maleArr,
        },
        {
          label: "女",
          backgroundColor: "#FFA08A",
          borderWidth: 1,
          data: femaleArr,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: false,
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  });
  hideLoading();
  showDistrictSelect();
  $("#district_select").on("change", function () {
    const currentDistrict = getCurrentSelectDistrict();
    const { maleArr, femaleArr } = getSingleDistrictLivingData(currentDistrict);
    updateBarChart(barChart, maleArr, femaleArr);
  });
}

async function fetchLivingData() {
  const apiUrl =
    "https://od.moi.gov.tw/api/v1/rest/datastore/301000000A-000082-045";
  const fallbackApiUrl = "apiData.json";
  const fetchData = async (apiEndpoint) => {
    const res = await fetch(apiEndpoint, {
      method: "GET",
    });
    return res.json();
  };
  let data = false;
  try {
    data = await fetchData(apiUrl);
    console.log("try official api success:", data);
  } catch (err) {
    console.log("api retrieval failed. Try fallback");
    try {
      data = await fetchData(fallbackApiUrl);
      console.log("try fallback api success:", data);
    } catch (err) {
      console.log("all api data retrieval failed");
      data = false;
    }
  }
  return data;
}

function getCurrentSelectDistrict() {
  const district = $("#district_select").val();
  return district;
}

function arrangeTaipeiDistricts(livingRawData) {
  let taipeiDistricts = filterOutTaipeiLivingData(livingRawData);
  taipeiDistricts = taipeiDistricts.reduce((accumulator, currentValue) => {
    if (accumulator.indexOf(currentValue.site_id) === -1) {
      accumulator.push(currentValue.site_id);
    }
    return accumulator;
  }, []);

  return taipeiDistricts;
}

function arrangeTaipeiLivingData(livingRawData) {
  let taipeiLivingData = filterOutTaipeiLivingData(livingRawData);
  let districtObjs = taipeiLivingData.reduce((finalObj, currentObj) => {
    let district = currentObj.site_id;

    if (!finalObj[district]) {
      finalObj[district] = {
        male: {
          ordinary: parseInt(currentObj.household_ordinary_m, 10),
          single: parseInt(currentObj.household_single_m, 10),
        },
        female: {
          ordinary: parseInt(currentObj.household_ordinary_f, 10),
          single: parseInt(currentObj.household_single_f, 10),
        },
      };
    } else {
      finalObj[district]["male"]["ordinary"] += parseInt(
        currentObj.household_ordinary_m,
        10
      );
      finalObj[district]["male"]["single"] += parseInt(
        currentObj.household_single_m,
        10
      );
      finalObj[district]["female"]["ordinary"] += parseInt(
        currentObj.household_ordinary_f,
        10
      );
      finalObj[district]["female"]["single"] += parseInt(
        currentObj.household_single_f,
        10
      );
    }
    return finalObj;
  }, {});

  return districtObjs;
}

function setDistrictDropdown(districts) {
  const districtSelect = document.getElementById("district_select");
  const districtArr = districts.map((district) => {
    const displayDistrict = district.replace("臺北市", "");
    return {
      id: district,
      text: displayDistrict,
    };
  });

  $("#district_select").select2({
    containerCss: { display: "block" },
    width: "60%",
    data: districtArr,
    minimumResultsForSearch: Infinity,
  });
}

function filterOutTaipeiLivingData(livingRawData) {
  let taipeiDistrictsData = livingRawData.filter((item) => {
    return item.site_id.includes("臺北");
  });
  return taipeiDistrictsData;
}

function saveDataIntoSessionStorage(arrangedTaipeiLivingData) {
  const taipeiLivingData = JSON.stringify(arrangedTaipeiLivingData);
  sessionStorage.setItem("livingData", taipeiLivingData);
}

function getDataFromSessionStorage() {
  const taipeiLivingData = JSON.parse(sessionStorage.getItem("livingData"));
  return taipeiLivingData;
}

function getSingleDistrictLivingData(district) {
  const singleDistrictData = getDataFromSessionStorage()[district];
  const maleArr = [
    singleDistrictData.male.ordinary,
    singleDistrictData.male.single,
  ];
  const femaleArr = [
    singleDistrictData.female.ordinary,
    singleDistrictData.female.single,
  ];
  const livingObj = {
    maleArr: maleArr,
    femaleArr: femaleArr,
  };
  return livingObj;
}

function updateBarChart(barChart, maleArr, femaleArr) {
  barChart.data.datasets[0].data = maleArr;
  barChart.data.datasets[1].data = femaleArr;
  barChart.update();
}

function showDistrictSelect() {
  $("#select_container").css("display", "flex");
}

function showLoading() {
  $("#loading_container").show();
}

function hideLoading() {
  $("#loading_container").hide();
}

function showErrorMsg() {
  $("#error_container").show();
}
