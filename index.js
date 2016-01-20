angular.module('app', ['onsen'])

.controller('CountriesController', ['$scope', 'Countries', function($scope, Countries) {
  var that = this;

  Countries.get()
    .then(
      function(countries) {
        that.list = countries;
      }
    );

  this.showCountry = function(country) {
    $scope.navi.pushPage('country.html', {name: country});
  };
}])

.controller('CountryController', ['$scope', 'Population', function($scope, Population) {
  var that = this;

  this.name = $scope.navi.getCurrentPage().options.name;

  this.showChart = false;
  $scope.navi.on('postpush', function() {
    $scope.$evalAsync(function() {
      that.showChart = true;
    });

    $scope.navi.off('postpush');
  });

  var currentYear = (new Date()).getUTCFullYear();
  this.year = currentYear + '';

  this.years = [];
  for (var i = 1950; i <= 2100; i++) {
    this.years.push('' + i);
  }

  this.getPopulation = function() {
    Population.get(this.name, this.year)
      .then(
        function(population) {
          that.population = population;
        }
      );
  };

  $scope.$watch('country.year', function() {
    that.getPopulation();
  });
}])

.service('Countries', ['$http', function($http) {
  this.get = function() {
    return $http.get('/countries.json')
      .then(
        function(response) {
          return response.data.countries;
        }
      );
  };
}])

.service('Population', ['$http', function($http) {
  this.get = function(country, year) {
    return $http.jsonp('http://api.population.io:80/1.0/population/' + year + '/' + country + '/?format=jsonp&callback=JSON_CALLBACK')
      .then(
        function(response) {
          return response.data;
        }
      );
  };
}])

.factory('nv', function() {
  return nv;
})

.factory('d3', function() {
  return d3;
})

.controller('PopulationChartController', ['$scope', function($scope) {
  $scope.formatData = function() {
    if (!$scope.data) {
      return [];
    }

    var total = [],
      males = [],
      females =[];

    for (var i = 0; i < $scope.data.length; i++) {
      var data = $scope.data[i];

      total.push({x: data.age, y: data.total});
      males.push({x: data.age, y: data.males});
      females.push({x: data.age, y: data.females});
    }

    return [
      {
        key: 'Total',
        values: total
      },
      {
        key: 'Women',
        values: females
      },
      {
        key: 'Men',
        values: males
      }
    ];
  };


  $scope.$on('chartloaded', function(event) {
    event.stopPropagation();

    $scope.updateChart($scope.formatData());

    $scope.$watch('data', function() {
      if ($scope.data) {
        $scope.updateChart($scope.formatData());
      }
    });
  });
}])

.directive('populationChart', ['nv', 'd3', function(nv, d3) {
  return {
    restrict: 'E',
    scope: {
      data: '='
    },
    controller: 'PopulationChartController',
    link: function(scope, element, attrs) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      element.append(svg);

      var chart;

      scope.updateChart = function(data) {
        d3.select(svg)
          .datum(data)
          .call(chart);
      };

      nv.addGraph(function() {
        chart = nv.models.stackedAreaChart()
        .useInteractiveGuideline(true)
        .showControls(false)
        .margin({left: 50, right: 30});

        chart.xAxis
          .tickFormat(d3.format(',r'));

        chart.yAxis
          .tickFormat(function(d) {
            if ((d / 1000000) >= 1) {
              d = Math.round(d / 100000) / 10 + 'M';
            }
            else if ((d / 1000) >= 1) {
              d = Math.round(d / 100) / 10 + 'K';
            }
            return d;
          });

        nv.utils.windowResize(function() {
          chart.update();
        });

        scope.$emit('chartloaded');

        return chart;
      });
    }
  }
}]);
