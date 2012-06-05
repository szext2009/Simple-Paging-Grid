(function ($) {
    function dataPage(data, currentPage, pageSize) {
        return data.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
    }

    $.fn.simplePagingGrid = function (options) {
        var templates = $.extend({
            buttonBarTemplate: '<div><button class="btn pull-left">&laquo; Prev</button><button class="btn pull-right">Next &raquo</button><div class="page-numbers"></div><div class="clearfix"></div>',
            tableTemplate: '<table><thead></thead><tbody></tbody></table>',
            headerTemplate: '<th width="{{width}}">{{title}}</th>',
            sortableHeaderTemplate: '<th width="{{width}}"><ul class="sort"><li class="sort-ascending"/><li class="sort-descending"/></ul>{{title}}</th>',
            emptyCellTemplate: '<td>&nbsp;</td>',
            loadingOverlayTemplate: '<div class="loading"></div>',
            currentPageTemplate: '<span class="page-number">{{pageNumber}}</span>',
            pageLinkTemplate: '<a class="page-number" href="#">{{pageNumber}}</a>'
        }, options.templates);
        
        var settings = $.extend({
            pageSize: 10,
            columnWidths: [],
            cellTemplates: null,
            headerTemplates: null,
            sortable: [],
            sortOrder: "asc",
            initialSortColumn: null,
            tableClass: "table",
            dataFunction: null,
            dataUrl: null,
            data: null,
            minimumVisibleRows: 10,
            showLoadingOverlay: true,
            showPageNumbers: true,
            numberOfPageLinks: 10
        }, options);
        
        settings.templates = templates;

        return this.each(function () {
            var table;
            var tbody;
            var thead;
            var headerRow;
            var data;
            var currentPage = 0;
            var buttonBar;
            var previousButton;
            var nextButton;
            var pageData;
            var numberOfRows = null;
            var fetchingData = false;
            var sortOrder = settings.sortOrder;
            var sortedColumn = settings.initialSortColumn;
            var sortElement = null;
            var loadingOverlay = null;
            var gridElement = this;
            var $this = $(this);

            function configureButtons() {
                if (fetchingData) {
                    previousButton.attr('disabled', 'disabled');
                    nextButton.attr('disabled', 'disabled');
                }
                else {
                    if (currentPage === 0) {
                        previousButton.attr('disabled', 'disabled');
                    }
                    else {
                        previousButton.removeAttr('disabled');
                    }

                    if (pageData.length < settings.pageSize) {
                        nextButton.attr('disabled', 'disabled');
                    }
                    else {
                        nextButton.removeAttr('disabled');
                    }
                }
            }
            
            function configurePageNumbers() {
                function createPageNumberClickHandler(pageNumber) {
                    return function(ev) {
                        ev.preventDefault();
                        currentPage = pageNumber-1;
                        refreshData();
                    };
                }
                if (settings.showPageNumbers && numberOfRows !== null) {
                    var firstPage;
                    var lastPage;
                    var totalPages = numberOfRows % settings.pageSize + 1;
                    var pages = [];
                    var index;
                    var pageNumberElement;
                    
                    firstPage = currentPage - settings.numberOfPageLinks/2;
                    if (firstPage < 1) {
                        firstPage = 1;
                        lastPage = 10;
                        if (lastPage > totalPages) {
                            lastPage = totalPages;
                        }
                    }
                    else
                    {
                        lastPage = currentPage + settings.numberOfPageLinks/2;
                        if (lastPage > settings.numberOfPageLinks) {
                            firstPage = lastPage - settings.numberOfPageLinks;
                            if (firstPage < 1) firstPage=1;
                        }
                    }
                    
                    var pageNumberContainer = buttonBar.find(".page-numbers");
                    pageNumberContainer.empty();
                    for (index = firstPage; index <= lastPage; index++) {
                        if (index === (currentPage+1)) {
                            pageNumberElement= $(Mustache.render(settings.templates.currentPageTemplate, { pageNumber: index} ))
                        }
                        else {
                            pageNumberElement = $(Mustache.render(settings.templates.pageLinkTemplate, { pageNumber: index} ));
                            pageNumberElement.click(createPageNumberClickHandler(index));
                        }
                        pageNumberContainer.append(pageNumberElement);
                    }                    
                }
            }
            
            function sizeLoadingOverlay() {
                if (loadingOverlay != null) {
                    loadingOverlay.width($this.width());
                    loadingOverlay.height($this.height());
                }
            }
            
            function showLoading() {
                if (settings.showLoadingOverlay) {
                    loadingOverlay = $(settings.templates.loadingOverlayTemplate)
                    sizeLoadingOverlay();
                    $this.prepend(loadingOverlay);
                }
            }
            
            function hideLoading() {
                if (loadingOverlay !== null) {
                    loadingOverlay.remove();
                    loadingOverlay = null;
                }
            }
            
            function getPageDataFromSource(sourceData) {
                if ($.isArray(sourceData)) {
                    pageData = sourceData;
                }
                else if ($.isPlainObject(sourceData)) {
                    pageData = sourceData.currentPage;
                    numberOfRows = sourceData.totalRows;
                }
            }

            function refreshData(newDataUrl) {
                var sortedData;
                var aVal;
                var bVal;
                var dataToSort;
                
                if (newDataUrl !== undefined) {
                    settings.dataUrl = newDataUrl;
                    currentPage = 0;
                }
                
                if (settings.data !== null) {
                    if ($.isArray(settings.data)) {
                        dataToSort = sourceData;
                    }
                    else if ($.isPlainObject(settings.data)) {
                        dataToSort = settings.data.currentPage;
                        numberOfRows = settings.data.totalRows;
                    }
                    sortedData = sortedColumn === null ? dataToSort : dataToSort.sort(function(a, b) {
	                    aVal = sortOrder === "asc" ? a[sortedColumn] : b[sortedColumn];
                        bVal = sortOrder === "asc" ? b[sortedColumn] : a[sortedColumn];
                        if ($.isNumeric(aVal)) {
	                       if (aVal < bVal) {
                               return 1;
                           }
                           else if (aVal > bVal ) {
                               return -1;
						   }
                           return 0;
                        }
                        return aVal.localeCompare(bVal);
                    });
                    pageData = dataPage(sortedData, currentPage, settings.pageSize);
                    gridElement.currentData = pageData;
                    loadData();
                    configureButtons();
                    configurePageNumbers();
                }
                else if (settings.dataUrl !== null) {
                    fetchingData = true;
                    configureButtons();
                    showLoading();
                    $.getJSON(settings.dataUrl, { page: currentPage, pageSize: settings.pageSize, sortColumn: sortedColumn, sortOrder: sortOrder }, function (jsonData) {
                        getPageDataFromSource(jsonData);
                        gridElement.currentData = pageData;
                        loadData();
                        fetchingData = false;
                        configureButtons();
                        configurePageNumbers();
                        hideLoading();
                    });
                }
                else if (settings.dataFunction !== null) {
                    getPageDataFromSource(settings.dataFunction(currentPage, settings.pageSize, sortedColumn, sortOrder));
                    gridElement.currentData = pageData;
                    loadData();
                    configureButtons();
                    configurePageNumbers();
                }
            }

            function loadData() {
                tbody.empty();
                $.each(pageData, function (rowIndex, rowData) {
                    var tr = $('<tr>');
                    $.each(settings.columnKeys, function (index, propertyName) {
                        var td = $('<td>');
                        if (settings.cellTemplates !== null && index < settings.cellTemplates.length && settings.cellTemplates[index] !== null) {
                            td.html(Mustache.render(settings.cellTemplates[index], rowData));
                        }
                        else {
                            td.html(rowData[propertyName]);
                        }
                        tr.append(td);
                    });
                    tbody.append(tr);
                });
                
                if (pageData.length < settings.minimumVisibleRows) {
                    var emptyRowIndex;
                    var emptyRow;
                    for (emptyRowIndex = pageData.length; emptyRowIndex < settings.minimumVisibleRows; emptyRowIndex++) {
                        emptyRow = $('<tr>');
                        $.each(settings.columnKeys, function() {
                            emptyRow.append(Mustache.render(settings.templates.emptyCellTemplate));
                        });
                        tbody.append(emptyRow);
                    }
                }
            }

            table = $(settings.templates.tableTemplate);
            thead = table.find("thead");
            headerRow = $("<tr>").appendTo(thead);
            tbody = table.find("tbody");

            $.each(settings.columnNames, function (index, columnName) {
                var sortEnabled = settings.sortable[index];
                var sortAscending;
                var sortDescending;
                var columnKey = settings.columnKeys[index];
                var width;
                var headerCell = null;

                width = settings.columnWidths.length > index ?settings.columnWidths[index] : "";
                if (settings.headerTemplates !== null && index < settings.headerTemplates.length && settings.headerTemplates[index] != null) {
                    headerCell = $(Mustache.render(settings.headerTemplates[index], { width: width, title: columnName }));
                }

                if (sortEnabled) {
                    if (headerCell === null) {
                        headerCell = $(Mustache.render(settings.templates.sortableHeaderTemplate, {width:width, title:columnName}));
                    }
                    sortAscending = headerCell.find(".sort-ascending");
                    sortDescending = headerCell.find(".sort-descending");

                    function sort(event) {
                        event.preventDefault();
                        if (sortedColumn === columnKey) {
                            sortOrder = sortOrder === "asc" ? "desc" : "asc";
                        }
                        sortedColumn = columnKey;
                        if (sortElement != null) {
                            sortElement.removeClass("sort-ascending-active");
                            sortElement.removeClass("sort-descending-active");
                        }
                        sortElement = sortOrder === "asc" ? sortAscending : sortDescending;
                        sortElement.addClass(sortOrder === "asc" ? "sort-ascending-active" : "sort-descending-active");
                        refreshData();
                    };

                    sortAscending.click(function (event) {
                        sort(event);
                    });

                    sortDescending.click(function (event) {
                        sort(event);
                    });
                }
                else {
                    if (headerCell === null) {
                        headerCell = $(Mustache.render(settings.templates.headerTemplate, { width:width, title:columnName }));
                    }
                }
                headerRow.append(headerCell);
            });

            table.addClass(settings.tableClass);

            buttonBarHtml = settings.templates.buttonBarTemplate;
            buttonBar = $(buttonBarHtml);
            previousButton = buttonBar.find('button').first();
            nextButton = buttonBar.find('button').last();
            previousButton.click(function (event) {
                event.preventDefault();
                if (currentPage > 0) {
                    currentPage--;
                    refreshData();
                }
            });
            nextButton.click(function (event) {
                event.preventDefault();
                if (pageData.length === settings.pageSize) {
                    currentPage++;
                    refreshData();
                }
            });

            refreshData();

            $this.append(table);
            $this.append(buttonBar);
            $(window).resize(sizeLoadingOverlay);
            gridElement.refreshData = refreshData;
            return this;
        });
    };
})(jQuery);