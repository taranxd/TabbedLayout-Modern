window.vifabric =
  window.vifabric ||
  (function() {
      // #region custom viizCom utilities
      var fabric;
      (function(fabric) {
          var Utilities = (function() {
              var Utilities = {};
              Utilities.closeMenu = function() {
                  Utilities.fireEvent(document, 'click');
              };
              Utilities.fireEvent = function(node, eventName) {
                  // Make sure we use the ownerDocument from the provided node to avoid cross-window problems
                  var doc;
                  if (node.ownerDocument) {
                      doc = node.ownerDocument;
                  } else if (node.nodeType == 9) {
                      // the node may be the document itself, nodeType 9 = DOCUMENT_NODE
                      doc = node;
                  } else {
                      throw new Error('Invalid node passed to fireEvent: ' + node.id);
                  }

                  if (node.dispatchEvent) {
                      // Gecko-style approach (now the standard) takes more work
                      var eventClass = '';

                      // Different events have different event classes.
                      // If this switch statement can't map an eventName to an eventClass,
                      // the event firing is going to fail.
                      switch (eventName) {
                      case 'click': // Dispatching of 'click' appears to not work correctly in Safari. Use 'mousedown' or 'mouseup' instead.
                      case 'mousedown':
                      case 'mouseup':
                          eventClass = 'MouseEvents';
                          break;

                      case 'focus':
                      case 'change':
                      case 'blur':
                      case 'select':
                          eventClass = 'HTMLEvents';
                          break;

                      default:
                          throw "fireEvent: Couldn't find an event class for event '" + eventName + "'.";
                          break;
                      }
                      var event = doc.createEvent(eventClass);
                      event.initEvent(eventName, true, true); // All events created as bubbling and cancelable.

                      event.synthetic = true; // allow detection of synthetic events
                      // The second parameter says go ahead with the default action
                      node.dispatchEvent(event, true);
                  } else if (node.fireEvent) {
                      // IE-old school style, you can drop this if you don't need to support IE8 and lower
                      var event = doc.createEventObject();
                      event.synthetic = true; // allow detection of synthetic events
                      node.fireEvent('on' + eventName, event);
                  }
              };
              Utilities.stopEvent = function(e) {
                  var event = e || window.event;
                  event.stopPropagation && event.stopPropagation();
                  event.preventDefault && event.preventDefault();
                  event.cancelBubble = true;
                  event.returnValue = false;
              };
              return Utilities;
          })();
          fabric.Utilities = Utilities;

          var COLOR_PICKER_VALUE_DIV_CLASS = 'vi-ColorPickerValueDiv';
          var COLOR_PICKER_DIV_CLASS = 'vi-ColorPickerDiv';
          var COLOR_PICKER_TRIGGER_ON_DRAG_CLASS = 'vi-trigger-on-drag';
          var ColorPicker = (function() {
              function ColorPicker(textBox, onChange, triggerChangeOnDrag) {
                  this.textBox = textBox;
                  this.container = textBox.parentElement;
                  this.value = textBox.value;
                  this.triggerChangeOnDrag = triggerChangeOnDrag === true || this.textBox.classList.contains(COLOR_PICKER_TRIGGER_ON_DRAG_CLASS);
                  this.onChange = onChange;

                  this.init();
              }

              ColorPicker.prototype.init = function() {
                  var self = this;
                  var div = document.createElement('div');
                  div.classList.add(COLOR_PICKER_VALUE_DIV_CLASS);
                  self.container.appendChild(div);
                  div.style.height = '30px';
                  if (self.value) div.style.backgroundColor = self.value;

                  var colorPicker = document.createElement('div');
                  self.container.appendChild(colorPicker);
                  colorPicker.classList.add(COLOR_PICKER_DIV_CLASS);
                  colorPicker.style.border = 'solid 1px #ccc';
                  colorPicker.style.padding = '5px';

                  var canvasBlock = document.createElement('canvas');
                  colorPicker.appendChild(canvasBlock);
                  canvasBlock.style.height = '150px';
                  canvasBlock.style.width = '80%';
                  canvasBlock.style.cursor = 'crosshair';
                  var blockCtx = canvasBlock.getContext('2d');
                  var blockHeight = canvasBlock.height;
                  var blocviidth = canvasBlock.width;

                  var canvasDivider = document.createElement('canvas');
                  colorPicker.appendChild(canvasDivider);
                  canvasDivider.style.width = '2%';

                  var canvasStrip = document.createElement('canvas');
                  colorPicker.appendChild(canvasStrip);
                  canvasStrip.style.height = '150px';
                  canvasStrip.style.width = '18%';
                  canvasStrip.style.cursor = 'crosshair';
                  var stripCtx = canvasStrip.getContext('2d');
                  var stripHeight = canvasStrip.height;
                  var stripWidth = canvasStrip.width;

                  var x = 0;
                  var y = 0;
                  var drag = false;
                  var rgbaColor = 'rgba(255,0,0,1)';
                  var rgbaHex = '';

                  function fillGradient() {
                      blockCtx.fillStyle = rgbaColor;
                      blockCtx.fillRect(0, 0, blocviidth, blockHeight);

                      var grdWhite = stripCtx.createLinearGradient(0, 0, blocviidth, 0);
                      grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
                      grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
                      blockCtx.fillStyle = grdWhite;
                      blockCtx.fillRect(0, 0, blocviidth, blockHeight);

                      var grdBlack = stripCtx.createLinearGradient(0, 0, 0, blockHeight);
                      grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
                      grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
                      blockCtx.fillStyle = grdBlack;
                      blockCtx.fillRect(0, 0, blocviidth, blockHeight);
                  }

                  function changeColor(e) {
                      x = e.offsetX;
                      y = e.offsetY;
                      var imageData = blockCtx.getImageData(x, y, 1, 1).data;
                      rgbaColor = 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
                      rgbaHex = ('#' + imageData[0].toString(16) + imageData[1].toString(16) + imageData[2].toString(16)).toUpperCase();
                      div.style.backgroundColor = rgbaHex;
                      if (self.triggerChangeOnDrag) {
                          notifyChange();
                      }
                  }

                  function click(e) {
                      x = e.offsetX;
                      y = e.offsetY;
                      var imageData = stripCtx.getImageData(x, y, 1, 1).data;
                      rgbaColor = 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
                      rgbaHex = ('#' + imageData[0].toString(16) + imageData[1].toString(16) + imageData[2].toString(16)).toUpperCase();
                      fillGradient();
                  }

                  function mousedown(e) {
                      drag = true;
                      changeColor(e);
                  }

                  function mousemove(e) {
                      if (drag) {
                          changeColor(e);
                      }
                  }

                  function mouseup(e) {
                      drag = false;

                      notifyChange();
                  }

                  function notifyChange() {
                      if (typeof self.onChange === 'function') self.onChange(rgbaHex);
                      self.textBox.value = rgbaHex;

                      /** Trigger any change event tied to the original dropdown. */
                      var changeEvent = document.createEvent('HTMLEvents');
                      changeEvent.initEvent('change', false, true);
                      self.textBox.dispatchEvent(changeEvent);
                  }

                  blockCtx.rect(0, 0, blocviidth, blockHeight);
                  fillGradient();

                  stripCtx.rect(0, 0, stripWidth, stripHeight);
                  var grd1 = stripCtx.createLinearGradient(0, 0, 0, blockHeight);
                  grd1.addColorStop(0, 'rgba(255, 0, 0, 1)');
                  grd1.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
                  grd1.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
                  grd1.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
                  grd1.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
                  grd1.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
                  grd1.addColorStop(1, 'rgba(255, 0, 0, 1)');
                  stripCtx.fillStyle = grd1;
                  stripCtx.fill();

                  canvasStrip.addEventListener('click', click, false);

                  canvasBlock.addEventListener('mousedown', mousedown, false);
                  canvasBlock.addEventListener('mouseup', mouseup, false);
                  canvasBlock.addEventListener('mousemove', mousemove, false);
              };

              return ColorPicker;
          })();
          fabric.ColorPicker = ColorPicker;

          /*Add all icons in fabric UI */
          fabric.allIcons = [
              '12PointStar',
              '6PointStar',
              'AADLogo',
              'Accept',
              'AccessLogo',
              'AccessLogoFill',
              'AccountManagement',
              'Accounts',
              'ActivateOrders',
              'ActivityFeed',
              'Add',
              'AddBookmark',
              'AddEvent',
              'AddFavorite',
              'AddFavoriteFill',
              'AddFriend',
              'AddGroup',
              'AddNotes',
              'AddOnlineMeeting',
              'AddPhone',
              'AddTo',
              'Admin',
              'AdminALogo32',
              'AdminALogoFill32',
              'AdminALogoInverse32',
              'AdminCLogoInverse32',
              'AdminDLogoInverse32',
              'AdminELogoInverse32',
              'AdminLLogoInverse32',
              'AdminMLogoInverse32',
              'AdminOLogoInverse32',
              'AdminPLogoInverse32',
              'AdminSLogoInverse32',
              'AdminYLogoInverse32',
              'Airplane',
              'AirplaneSolid',
              'AirTickets',
              'AlarmClock',
              'Album',
              'AlbumRemove',
              'AlertSolid',
              'AlignCenter',
              'AlignHorizontalCenter',
              'AlignHorizontalLeft',
              'AlignHorizontalRight',
              'AlignJustify',
              'AlignLeft',
              'AlignRight',
              'AlignVerticalBottom',
              'AlignVerticalCenter',
              'AlignVerticalTop',
              'AllApps',
              'AllAppsMirrored',
              'AnalyticsLogo',
              'AnalyticsQuery',
              'AnalyticsReport',
              'AnalyticsView',
              'AnchorLock',
              'Annotation',
              'AppIconDefault',
              'Archive',
              'AreaChart',
              'ArrangeBringForward',
              'ArrangeBringToFront',
              'ArrangeByFrom',
              'ArrangeSendBacviard',
              'ArrangeSendToBack',
              'Arrivals',
              'ArrowDownRight8',
              'ArrowDownRightMirrored8',
              'ArrowTallDownLeft',
              'ArrowTallDownRight',
              'ArrowTallUpLeft',
              'ArrowTallUpRight',
              'ArrowUpRight',
              'ArrowUpRight8',
              'ArrowUpRightMirrored8',
              'Articles',
              'Ascending',
              'AspectRatio',
              'AssessmentGroup',
              'AssessmentGroupTemplate',
              'AssetLibrary',
              'Assign',
              'Asterisk',
              'AsteriskSolid',
              'ATPLogo',
              'Attach',
              'AustralianRules',
              'AutoEnhanceOff',
              'AutoEnhanceOn',
              'AutoFillTemplate',
              'AutoHeight',
              'AutoRacing',
              'AwayStatus',
              'AzureAPIManagement',
              'AzureKeyVault',
              'AzureLogo',
              'AzureServiceEndpoint',
              'Back',
              'BackgroundColor',
              'Backlog',
              'BacklogBoard',
              'BackToWindow',
              'Badge',
              'Balloons',
              'BankSolid',
              'BarChart4',
              'BarChartHorizontal',
              'BarChartVertical',
              'Baseball',
              'BeerMug',
              'BIDashboard',
              'BidiLtr',
              'BidiRtl',
              'BingLogo',
              'BirthdayCake',
              'BlockContact',
              'Blocked',
              'Blocked12',
              'Blocked2',
              'BlockedSite',
              'BlockedSolid',
              'BlowingSnow',
              'Blur',
              'Boards',
              'Bold',
              'BookingsLogo',
              'Bookmarks',
              'BookmarksMirrored',
              'BorderDash',
              'BorderDot',
              'BoxAdditionSolid',
              'BoxCheckmarkSolid',
              'BoxMultiplySolid',
              'BoxPlaySolid',
              'BoxSubtractSolid',
              'BranchCommit',
              'BranchCompare',
              'BranchFork',
              'BranchFork2',
              'BranchLocked',
              'BranchMerge',
              'BranchPullRequest',
              'BranchSearch',
              'BranchShelveset',
              'Breadcrumb',
              'Breakfast',
              'Brightness',
              'Broom',
              'BrowserScreenShot',
              'BrowserTab',
              'BrowserTabScreenshot',
              'Brunch',
              'BucketColor',
              'BucketColorFill',
              'BufferTimeAfter',
              'BufferTimeBefore',
              'BufferTimeBoth',
              'Bug',
              'BugSolid',
              'Build',
              'BuildIssue',
              'BuildQueue',
              'BuildQueueNew',
              'BulkUpload',
              'BulletedList',
              'BulletedList2',
              'BulletedList2Mirrored',
              'BulletedListMirrored',
              'Bullseye',
              'Bus',
              'BusinessCenterLogo',
              'BusinessHoursSign',
              'BusSolid',
              'Cafe',
              'Cake',
              'Calculator',
              'CalculatorAddition',
              'CalculatorEqualTo',
              'CalculatorMultiply',
              'CalculatorNotEqualTo',
              'CalculatorSubtract',
              'Calendar',
              'CalendarAgenda',
              'CalendarDay',
              'CalendarMirrored',
              'CalendarReply',
              'CalendarSettings',
              'CalendarSettingsMirrored',
              'CalendarWeek',
              'CalendarWorvieek',
              'CaloriesAdd',
              'Camera',
              'Cancel',
              'CannedChat',
              'Car',
              'CaretBottomLeftCenter8',
              'CaretBottomLeftSolid8',
              'CaretBottomRightCenter8',
              'CaretBottomRightSolid8',
              'CaretDown8',
              'CaretDownSolid8',
              'CaretHollow',
              'CaretHollowMirrored',
              'CaretLeft8',
              'CaretLeftSolid8',
              'CaretRight',
              'CaretRight8',
              'CaretRightSolid8',
              'CaretSolid',
              'CaretSolid16',
              'CaretSolidDown',
              'CaretSolidLeft',
              'CaretSolidMirrored',
              'CaretSolidRight',
              'CaretSolidUp',
              'CaretTopLeftCenter8',
              'CaretTopLeftSolid8',
              'CaretTopRightCenter8',
              'CaretTopRightSolid8',
              'CaretUp8',
              'CaretUpSolid8',
              'Cat',
              'CellPhone',
              'Certificate',
              'CertifiedDatabase',
              'Chart',
              'ChartSeries',
              'ChartXAngle',
              'ChartYAngle',
              'Chat',
              'ChatInviteFriend',
              'ChatSolid',
              'Checkbox',
              'CheckboxComposite',
              'CheckboxCompositeReversed',
              'CheckboxIndeterminate',
              'CheckedOutByOther12',
              'CheckedOutByYou12',
              'CheckList',
              'CheckMark',
              'ChevronDown',
              'ChevronDownEnd6',
              'ChevronDownMed',
              'ChevronDownSmall',
              'ChevronFold10',
              'ChevronLeft',
              'ChevronLeftEnd6',
              'ChevronLeftMed',
              'ChevronLeftSmall',
              'ChevronRight',
              'ChevronRightEnd6',
              'ChevronRightMed',
              'ChevronRightSmall',
              'ChevronUnfold10',
              'ChevronUp',
              'ChevronUpEnd6',
              'ChevronUpMed',
              'ChevronUpSmall',
              'Chopsticks',
              'ChromeBack',
              'ChromeBackMirrored',
              'ChromeClose',
              'ChromeMinimize',
              'CircleAddition',
              'CircleAdditionSolid',
              'CircleFill',
              'CircleHalfFull',
              'CirclePause',
              'CirclePauseSolid',
              'CirclePlus',
              'CircleRing',
              'CircleShapeSolid',
              'CircleStop',
              'CircleStopSolid',
              'CityNext',
              'ClassNotebookLogo16',
              'ClassNotebookLogo32',
              'ClassNotebookLogoFill16',
              'ClassNotebookLogoFill32',
              'ClassNotebookLogoInverse',
              'ClassNotebookLogoInverse16',
              'ClassNotebookLogoInverse32',
              'ClassroomLogo',
              'Clear',
              'ClearFilter',
              'ClearFormatting',
              'ClearNight',
              'ClipboardSolid',
              'Clock',
              'CloneToDesktop',
              'ClosedCaption',
              'ClosePane',
              'ClosePaneMirrored',
              'Cloud',
              'CloudAdd',
              'CloudDownload',
              'CloudUpload',
              'CloudWeather',
              'Cloudy',
              'Cocktails',
              'Code',
              'CodeEdit',
              'Coffee',
              'CoffeeScript',
              'CollapseContent',
              'CollapseContentSingle',
              'CollapseMenu',
              'CollegeFootball',
              'CollegeHoops',
              'Color',
              'ColorSolid',
              'ColumnLeftTwoThirds',
              'ColumnLeftTwoThirdsEdit',
              'ColumnOptions',
              'ColumnRightTwoThirds',
              'ColumnRightTwoThirdsEdit',
              'Combine',
              'Combobox',
              'CommandPrompt',
              'Comment',
              'CommentAdd',
              'CommentNext',
              'CommentPrevious',
              'CommentUrgent',
              'Commitments',
              'Communications',
              'CompanyDirectory',
              'CompanyDirectoryMirrored',
              'CompassNW',
              'Completed',
              'CompletedSolid',
              'ConfigurationSolid',
              'ConnectContacts',
              'ConstructionCone',
              'ConstructionConeSolid',
              'Contact',
              'ContactCard',
              'ContactCardSettings',
              'ContactCardSettingsMirrored',
              'ContactInfo',
              'ContactLink',
              'ContextMenu',
              'Contrast',
              'Copy',
              'Cotton',
              'CPlusPlus',
              'CPlusPlusLanguage',
              'CreateMailRule',
              'Cricket',
              'CRMReport',
              'Crop',
              'Crown',
              'CrownSolid',
              'CSharp',
              'CSharpLanguage',
              'CSS',
              'CustomList',
              'CustomListMirrored',
              'Cut',
              'Cycling',
              'DashboardAdd',
              'Database',
              'DataConnectionLibrary',
              'DateTime',
              'DateTime2',
              'DateTimeMirrored',
              'DeactivateOrders',
              'DecisionSolid',
              'DeclineCall',
              'DecreaseIndentLegacy',
              'DefaultRatio',
              'DefectSolid',
              'Delete',
              'DeleteColumns',
              'DeleteRows',
              'DeleteRowsMirrored',
              'DeleteTable',
              'DeliveryTruck',
              'DelveAnalytics',
              'DelveAnalyticsLogo',
              'DelveLogo',
              'DelveLogoFill',
              'DelveLogoInverse',
              'Deploy',
              'Descending',
              'Design',
              'DesktopScreenshot',
              'DeveloperTools',
              'Devices3',
              'Devices4',
              'Diagnostic',
              'Dialpad',
              'DiamondSolid',
              'Dictionary',
              'DictionaryRemove',
              'DietPlanNotebook',
              'DiffInline',
              'DiffSideBySide',
              'DisableUpdates',
              'Dislike',
              'DislikeSolid',
              'DockLeft',
              'DockLeftMirrored',
              'DockRight',
              'DocLibrary',
              'DocsLogoInverse',
              'Document',
              'DocumentApproval',
              'Documentation',
              'DocumentManagement',
              'DocumentReply',
              'DocumentSearch',
              'DocumentSet',
              'DOM',
              'DonutChart',
              'Door',
              'DoubleBookmark',
              'DoubleChevronDown',
              'DoubleChevronDown12',
              'DoubleChevronDown8',
              'DoubleChevronLeft',
              'DoubleChevronLeft12',
              'DoubleChevronLeft8',
              'DoubleChevronLeftMed',
              'DoubleChevronLeftMedMirrored',
              'DoubleChevronRight',
              'DoubleChevronRight12',
              'DoubleChevronRight8',
              'DoubleChevronUp',
              'DoubleChevronUp12',
              'DoubleChevronUp8',
              'DoubleColumn',
              'DoubleColumnEdit',
              'Down',
              'Download',
              'DownloadDocument',
              'DragObject',
              'DrillDown',
              'DrillDownSolid',
              'DrillExpand',
              'DrillShow',
              'DrillThrough',
              'DRM',
              'Drop',
              'Dropdown',
              'DropShapeSolid',
              'Duststorm',
              'Dynamics365Logo',
              'DynamicSMBLogo',
              'EatDrink',
              'EdgeLogo',
              'Edit',
              'EditContact',
              'EditMail',
              'EditMirrored',
              'EditNote',
              'EditPhoto',
              'EditSolid12',
              'EditSolidMirrored12',
              'EditStyle',
              'Education',
              'Ellipse',
              'Embed',
              'EMI',
              'Emoji',
              'Emoji2',
              'EmojiDisappointed',
              'EmojiNeutral',
              'EmojiTabSymbols',
              'EmptyRecycleBin',
              'Encryption',
              'EngineeringGroup',
              'EntryDecline',
              'EntryView',
              'Equalizer',
              'EraseTool',
              'Error',
              'ErrorBadge',
              'Event',
              'EventAccepted',
              'EventDate',
              'EventDeclined',
              'EventInfo',
              'EventTentative',
              'EventTentativeMirrored',
              'ExcelDocument',
              'ExcelLogo',
              'ExcelLogo16',
              'ExcelLogoFill',
              'ExcelLogoFill16',
              'ExcelLogoInverse',
              'ExcelLogoInverse16',
              'ExchangeLogo',
              'ExchangeLogoFill',
              'ExchangeLogoInverse',
              'ExerciseTracker',
              'ExpandMenu',
              'ExploreContent',
              'ExploreContentSingle',
              'ExploreData',
              'Export',
              'ExportMirrored',
              'ExternalBuild',
              'ExternalGit',
              'ExternalTFVC',
              'ExternalXAML',
              'F12DevTools',
              'FabricAssetLibrary',
              'FabricDataConnectionLibrary',
              'FabricDocLibrary',
              'FabricFolder',
              'FabricFolderFill',
              'FabricFolderSearch',
              'FabricFormLibrary',
              'FabricFormLibraryMirrored',
              'FabricMovetoFolder',
              'FabricNewFolder',
              'FabricOpenFolderHorizontal',
              'FabricPictureLibrary',
              'FabricPublicFolder',
              'FabricReportLibrary',
              'FabricReportLibraryMirrored',
              'FabricSyncFolder',
              'FabricUnsyncFolder',
              'Family',
              'FangBody',
              'FastForward',
              'FastMode',
              'Favicon',
              'FavoriteList',
              'FavoriteStar',
              'FavoriteStarFill',
              'Fax',
              'Feedback',
              'FeedbackRequestMirroredSolid',
              'FeedbackRequestSolid',
              'FeedbackResponseSolid',
              'Ferry',
              'FerrySolid',
              'FieldChanged',
              'FieldEmpty',
              'FieldFilled',
              'FieldNotChanged',
              'FieldReadOnly',
              'FieldRequired',
              'FileASPX',
              'FileBug',
              'FileCode',
              'FileComment',
              'FileCSS',
              'FileHTML',
              'FileImage',
              'FileJAVA',
              'FileLess',
              'FilePDB',
              'FileSass',
              'FileSQL',
              'FileSymlink',
              'FileTemplate',
              'FileTypeSolution',
              'FileYML',
              'Filter',
              'Filters',
              'FilterSolid',
              'FiltersSolid',
              'Financial',
              'FinancialMirroredSolid',
              'FinancialSolid',
              'Fingerprint',
              'FiveTileGrid',
              'Flag',
              'FlameSolid',
              'FlickDown',
              'FlickLeft',
              'FlickRight',
              'FlickUp',
              'Flow',
              'FocalPoint',
              'Fog',
              'Folder',
              'FolderFill',
              'FolderHorizontal',
              'FolderList',
              'FolderListMirrored',
              'FolderOpen',
              'FolderQuery',
              'FolderSearch',
              'FollowUser',
              'Font',
              'FontColor',
              'FontColorA',
              'FontColorSwatch',
              'FontDecrease',
              'FontIncrease',
              'FontSize',
              'FormLibrary',
              'FormLibraryMirrored',
              'Forward',
              'ForwardEvent',
              'Freezing',
              'Frigid',
              'FSharp',
              'FSharpLanguage',
              'FullCircleMask',
              'FullHistory',
              'FullScreen',
              'FullWidth',
              'FullWidthEdit',
              'FunctionalManagerDashboard',
              'GallatinLogo',
              'Generate',
              'GenericScan',
              'Giftbox',
              'GiftboxOpen',
              'GiftBoxSolid',
              'GiftCard',
              'GitFork',
              'GitGraph',
              'Glasses',
              'Glimmer',
              'GlobalNavButton',
              'Globe',
              'Globe2',
              'GlobeFavorite',
              'Golf',
              'GotoToday',
              'GridViewLarge',
              'GridViewMedium',
              'GridViewSmall',
              'GripperBarHorizontal',
              'GripperBarVertical',
              'GripperTool',
              'Group',
              'GroupedAscending',
              'GroupedDescending',
              'GroupedList',
              'GroupObject',
              'GUID',
              'Guitar',
              'HailDay',
              'HailNight',
              'HalfAlpha',
              'HalfCircle',
              'HandsFree',
              'Handwriting',
              'HardDrive',
              'HardDriveGroup',
              'HardDriveLock',
              'HardDriveUnlock',
              'Header1',
              'Header2',
              'Header3',
              'Header4',
              'Headset',
              'HeadsetSolid',
              'Health',
              'HealthSolid',
              'Heart',
              'HeartBroken',
              'HeartFill',
              'Help',
              'HelpMirrored',
              'Hexagon',
              'Hide',
              'Hide2',
              'Highlight',
              'HighlightMappedShapes',
              'HintText',
              'History',
              'Home',
              'HomeSolid',
              'HorizontalDistributeCenter',
              'Hospital',
              'Hotel',
              'HourGlass',
              'IconSetsFlag',
              'IDBadge',
              'ImageCrosshair',
              'ImageDiff',
              'ImagePixel',
              'ImageSearch',
              'Import',
              'Important',
              'ImportMirrored',
              'Inbox',
              'InboxCheck',
              'IncidentTriangle',
              'IncreaseIndentLegacy',
              'Info',
              'Info2',
              'InfoSolid',
              'InsertColumnsLeft',
              'InsertColumnsRight',
              'InsertRowsAbove',
              'InsertRowsBelow',
              'InsertSignatureLine',
              'InsertTextBox',
              'InstallToDrive',
              'InternetSharing',
              'IRMForward',
              'IRMForwardMirrored',
              'IRMReply',
              'IRMReplyMirrored',
              'IssueSolid',
              'IssueTracking',
              'IssueTrackingMirrored',
              'Italic',
              'JavaScriptLanguage',
              'JoinOnlineMeeting',
              'JS',
              'KaizalaLogo',
              'Label',
              'LadybugSolid',
              'Lamp',
              'LandscapeOrientation',
              'LaptopSecure',
              'LaptopSelected',
              'LargeGrid',
              'Leave',
              'Library',
              'Lifesaver',
              'LifesaverLock',
              'Light',
              'Lightbulb',
              'LightningBolt',
              'LightWeight',
              'Like',
              'LikeSolid',
              'Line',
              'LineChart',
              'LineSpacing',
              'LineStyle',
              'LineThickness',
              'Link',
              'LinkedInLogo',
              'List',
              'ListMirrored',
              'LocaleLanguage',
              'Location',
              'LocationCircle',
              'LocationDot',
              'LocationFill',
              'LocationOutline',
              'Lock',
              'LockSolid',
              'LogRemove',
              'LookupEntities',
              'LowerBrightness',
              'LyncLogo',
              'Mail',
              'MailAlert',
              'MailCheck',
              'MailFill',
              'MailForward',
              'MailForwardMirrored',
              'MailLowImportance',
              'MailPause',
              'MailReminder',
              'MailRepeat',
              'MailReply',
              'MailReplyAll',
              'MailReplyAllMirrored',
              'MailReplyMirrored',
              'MailSolid',
              'MailTentative',
              'MailTentativeMirrored',
              'MailUndelivered',
              'ManagerSelfService',
              'MapDirections',
              'MapPin',
              'MapPinSolid',
              'MarkDownLanguage',
              'Market',
              'MarketDown',
              'MasterDatabase',
              'MaximumValue',
              'Medal',
              'MediaAdd',
              'Medical',
              'Megaphone',
              'MegaphoneSolid',
              'Memo',
              'Merge',
              'MergeDuplicate',
              'Message',
              'MessageFill',
              'MicOff',
              'Microphone',
              'MicrosoftFlowLogo',
              'MicrosoftStaffhubLogo',
              'MiniContract',
              'MiniExpand',
              'MiniLink',
              'MinimumValue',
              'MobileReport',
              'MobileSelected',
              'Money',
              'More',
              'MoreSports',
              'MoreVertical',
              'Move',
              'Movers',
              'MoveToFolder',
              'MSNLogo',
              'MSNVideos',
              'MSNVideosSolid',
              'MTMLogo',
              'MultiSelect',
              'MultiSelectMirrored',
              'MusicInCollection',
              'MusicInCollectionFill',
              'MusicNote',
              'MyMoviesTV',
              'Nav2DMapView',
              'NavigateBack',
              'NavigateBackMirrored',
              'NavigateExternalInline',
              'NavigateForward',
              'NavigateForwardMirrored',
              'NavigationFlipper',
              'NetworkTower',
              'NewAnalyticsQuery',
              'NewFolder',
              'News',
              'NewsSearch',
              'NewTeamProject',
              'Next',
              'NonprofitLogo32',
              'NormalWeight',
              'NoteForward',
              'NotePinned',
              'NoteReply',
              'NotExecuted',
              'NotImpactedSolid',
              'NugetLogo',
              'NumberedList',
              'NumberField',
              'NumberSequence',
              'Octagon',
              'OEM',
              'OfficeAddinsLogo',
              'OfficeAssistantLogo',
              'OfficeFormsLogo',
              'OfficeFormsLogo16',
              'OfficeFormsLogo24',
              'OfficeFormsLogoFill',
              'OfficeFormsLogoFill16',
              'OfficeFormsLogoFill24',
              'OfficeFormsLogoInverse',
              'OfficeFormsLogoInverse16',
              'OfficeFormsLogoInverse24',
              'OfficeLogo',
              'OfficeStoreLogo',
              'OfficeVideoLogo',
              'OfficeVideoLogoFill',
              'OfficeVideoLogoInverse',
              'OfflineOneDriveParachute',
              'OfflineOneDriveParachuteDisabled',
              'OfflineStorageSolid',
              'OneDrive',
              'OneDriveAdd',
              'OneDriveFolder16',
              'OneNoteEduLogoInverse',
              'OneNoteLogo',
              'OneNoteLogo16',
              'OneNoteLogoFill',
              'OneNoteLogoFill16',
              'OneNoteLogoInverse',
              'OneNoteLogoInverse16',
              'OpenFile',
              'OpenFolderHorizontal',
              'OpenInNewWindow',
              'OpenPane',
              'OpenPaneMirrored',
              'OpenSource',
              'Org',
              'Orientation',
              'OutlookLogo',
              'OutlookLogo16',
              'OutlookLogoFill',
              'OutlookLogoFill16',
              'OutlookLogoInverse',
              'OutlookLogoInverse16',
              'OutOfOffice',
              'Package',
              'Packages',
              'Padding',
              'PaddingBottom',
              'PaddingLeft',
              'PaddingRight',
              'PaddingTop',
              'Page',
              'PageAdd',
              'PageCheckedin',
              'PageCheckedOut',
              'PageEdit',
              'PageLeft',
              'PageListMirroredSolid',
              'PageListSolid',
              'PageLock',
              'PageRemove',
              'PageRight',
              'PageSolid',
              'PanoIndicator',
              'Parachute',
              'ParachuteSolid',
              'Parameter',
              'ParkingLocation',
              'ParkingLocationMirrored',
              'ParkingMirroredSolid',
              'ParkingSolid',
              'PartlyCloudyDay',
              'PartlyCloudyNight',
              'PartyLeader',
              'Paste',
              'PasteAsCode',
              'PasteAsText',
              'Pause',
              'PaymentCard',
              'PC1',
              'PDF',
              'PencilReply',
              'Pentagon',
              'People',
              'PeopleAdd',
              'PeopleAlert',
              'PeopleBlock',
              'PeoplePause',
              'PeopleRepeat',
              'Permissions',
              'PermissionsSolid',
              'Personalize',
              'Phishing',
              'Phone',
              'Photo2',
              'Photo2Add',
              'Photo2Remove',
              'PhotoCollection',
              'Picture',
              'PictureCenter',
              'PictureFill',
              'PictureLibrary',
              'PicturePosition',
              'PictureStretch',
              'PictureTile',
              'PieDouble',
              'PieSingle',
              'PieSingleSolid',
              'Pill',
              'Pin',
              'Pinned',
              'PinnedFill',
              'PivotChart',
              'PlannerLogo',
              'PlanView',
              'Play',
              'PlayerSettings',
              'PlayResume',
              'Plug',
              'PlugConnected',
              'PlugDisconnected',
              'PlugSolid',
              'POI',
              'POISolid',
              'PostUpdate',
              'PowerApps',
              'PowerApps2Logo',
              'PowerAppsLogo',
              'PowerBILogo',
              'PowerButton',
              'PowerPointDocument',
              'PowerPointLogo',
              'PowerPointLogo16',
              'PowerPointLogoFill',
              'PowerPointLogoFill16',
              'PowerPointLogoInverse',
              'PowerPointLogoInverse16',
              'Precipitation',
              'PresenceChickletVideo',
              'Preview',
              'PreviewLink',
              'Previous',
              'PrimaryCalendar',
              'Print',
              'PrintfaxPrinterFile',
              'Processing',
              'ProcessMetaTask',
              'Product',
              'ProfileSearch',
              'ProFootball',
              'ProgressLoopInner',
              'ProgressLoopOuter',
              'ProgressRingDots',
              'ProHockey',
              'ProjectCollection',
              'ProjectLogo16',
              'ProjectLogo32',
              'ProjectLogoFill16',
              'ProjectLogoFill32',
              'ProjectLogoInverse',
              'ProtectedDocument',
              'ProtectionCenterLogo32',
              'ProtectRestrict',
              'PublicCalendar',
              'PublicContactCard',
              'PublicContactCardMirrored',
              'PublicEmail',
              'PublicFolder',
              'PublishCourse',
              'PublisherLogo',
              'PublisherLogo16',
              'PublisherLogoFill',
              'PublisherLogoFill16',
              'PublisherLogoInverse16',
              'Puzzle',
              'PY',
              'PythonLanguage',
              'QuarterCircle',
              'QueryList',
              'Questionnaire',
              'QuestionnaireMirrored',
              'QuickNote',
              'QuickNoteSolid',
              'R',
              'RadioBtnOff',
              'RadioBtnOn',
              'RadioBullet',
              'Rain',
              'RainShowersDay',
              'RainShowersNight',
              'RainSnow',
              'RawSource',
              'Read',
              'ReadingMode',
              'ReadingModeSolid',
              'ReadOutLoud',
              'ReceiptCheck',
              'ReceiptForward',
              'ReceiptReply',
              'ReceiptTentative',
              'ReceiptTentativeMirrored',
              'ReceiptUndelivered',
              'Recent',
              'Record2',
              'RectangleShapeSolid',
              'RectangularClipping',
              'RecurringEvent',
              'RecurringTask',
              'RecycleBin',
              'Redeploy',
              'RedEye',
              'Redo',
              'Refresh',
              'ReminderGroup',
              'ReminderPerson',
              'Remote',
              'Remove',
              'RemoveEvent',
              'RemoveFilter',
              'RemoveLink',
              'RemoveOccurrence',
              'Rename',
              'RenewalCurrent',
              'RenewalFuture',
              'ReopenPages',
              'Repair',
              'Reply',
              'ReplyAll',
              'ReplyAllAlt',
              'ReplyAllMirrored',
              'ReplyAlt',
              'ReplyMirrored',
              'Repo',
              'ReportAdd',
              'ReportHacked',
              'ReportLibrary',
              'ReportLibraryMirrored',
              'RepoSolid',
              'ReturnToSession',
              'ReviewRequestMirroredSolid',
              'ReviewRequestSolid',
              'ReviewResponseSolid',
              'ReviewSolid',
              'RevToggleKey',
              'Rewind',
              'Ribbon',
              'RibbonSolid',
              'RightDoubleQuote',
              'RightTriangle',
              'Ringer',
              'RingerOff',
              'RingerRemove',
              'Robot',
              'Rocket',
              'Room',
              'Rotate',
              'RowsChild',
              'RowsGroup',
              'Rugby',
              'Running',
              'Sad',
              'SadSolid',
              'Save',
              'SaveAll',
              'SaveAndClose',
              'SaveAs',
              'Savings',
              'ScaleUp',
              'ScheduleEventAction',
              'ScopeTemplate',
              'Script',
              'ScrollUpDown',
              'Search',
              'SearchAndApps',
              'SearchBookmark',
              'SearchCalendar',
              'SearchIssue',
              'SearchIssueMirrored',
              'Section',
              'Sections',
              'SecurityGroup',
              'SelectAll',
              'Sell',
              'SemiboldWeight',
              'Send',
              'SendMirrored',
              'Separator',
              'Server',
              'ServerEnviroment',
              'ServerProcesses',
              'SetAction',
              'Settings',
              'Share',
              'ShareiOS',
              'SharepointLogo',
              'SharepointLogoFill',
              'SharepointLogoInverse',
              'Shield',
              'ShieldSolid',
              'Shop',
              'ShoppingCart',
              'ShoppingCartSolid',
              'ShopServer',
              'ShowResults',
              'ShowResultsMirrored',
              'SidePanel',
              'SidePanelMirrored',
              'SignOut',
              'SingleBookmark',
              'SingleBookmarkSolid',
              'SingleColumn',
              'SingleColumnEdit',
              'SIPMove',
              'SiteScan',
              'SizeLegacy',
              'SkiResorts',
              'SkypeCheck',
              'SkypeCircleCheck',
              'SkypeCircleClock',
              'SkypeCircleMinus',
              'SkypeClock',
              'SkypeForBusinessLogo',
              'SkypeForBusinessLogo16',
              'SkypeForBusinessLogoFill',
              'SkypeForBusinessLogoFill16',
              'SkypeLogo',
              'SkypeLogo16',
              'SkypeMessage',
              'SkypeMinus',
              'Slider',
              'SliderHandleSize',
              'SliderThumb',
              'Snooze',
              'Snow',
              'Snowflake',
              'SnowShowerDay',
              'SnowShowerNight',
              'Soccer',
              'SocialListeningLogo',
              'Sort',
              'SortDown',
              'SortLines',
              'SortUp',
              'Source',
              'Spacer',
              'Speakers',
              'SpeedHigh',
              'Split',
              'SplitObject',
              'Sprint',
              'Squalls',
              'SquareShapeSolid',
              'Stack',
              'StackedBarChart',
              'StackedLineChart',
              'StackIndicator',
              'StaffNotebookLogo16',
              'StaffNotebookLogo32',
              'StaffNotebookLogoFill16',
              'StaffNotebookLogoFill32',
              'StaffNotebookLogoInverted16',
              'StaffNotebookLogoInverted32',
              'Starburst',
              'StarburstSolid',
              'StatusCircleBlock2',
              'StatusCircleCheckmark',
              'StatusCircleErrorX',
              'StatusCircleExclamation',
              'StatusCircleInfo',
              'StatusCircleInner',
              'StatusCircleOuter',
              'StatusCircleQuestionMark',
              'StatusCircleRing',
              'StatusErrorFull',
              'StatusTriangle',
              'StatusTriangleExclamation',
              'StatusTriangleInner',
              'StatusTriangleOuter',
              'Step',
              'StepInsert',
              'StepShared',
              'StepSharedAdd',
              'StepSharedInsert',
              'StockDown',
              'StockUp',
              'Stop',
              'StopSolid',
              'Stopwatch',
              'StoreLogo16',
              'StoreLogoMed20',
              'Storyboard',
              'Streaming',
              'StreamingOff',
              'StreamLogo',
              'Strikethrough',
              'Subscribe',
              'Subscript',
              'SubstitutionsIn',
              'Suitcase',
              'SunAdd',
              'Sunny',
              'SunQuestionMark',
              'Superscript',
              'SurveyQuestions',
              'SwayLogo16',
              'SwayLogo32',
              'SwayLogoFill16',
              'SwayLogoFill32',
              'SwayLogoInverse',
              'Switch',
              'SwitcherStartEnd',
              'Sync',
              'SyncFolder',
              'SyncOccurence',
              'SyncToPC',
              'System',
              'Tab',
              'Table',
              'Tablet',
              'TabletMode',
              'TabletSelected',
              'Tag',
              'Taskboard',
              'TaskGroup',
              'TaskGroupMirrored',
              'TaskLogo',
              'TaskManager',
              'TaskManagerMirrored',
              'TaskSolid',
              'Taxi',
              'TeamFavorite',
              'TeamsLogo',
              'TeamsLogoFill',
              'TeamsLogoInverse',
              'Teamwork',
              'Teeth',
              'TemporaryUser',
              'Tennis',
              'TestAutoSolid',
              'TestBeaker',
              'TestBeakerSolid',
              'TestCase',
              'TestExploreSolid',
              'TestImpactSolid',
              'TestParameter',
              'TestPlan',
              'TestStep',
              'TestSuite',
              'TestUserSolid',
              'TextBox',
              'TextCallout',
              'TextDocument',
              'TextDocumentShared',
              'TextField',
              'TextOverflow',
              'TFVCLogo',
              'ThisPC',
              'ThreeQuarterCircle',
              'ThumbnailView',
              'ThumbnailViewMirrored',
              'Thunderstorms',
              'Ticket',
              'Tiles',
              'Tiles2',
              'TimeEntry',
              'Timeline',
              'TimelineDelivery',
              'TimelineMatrixView',
              'TimelineProgress',
              'Timer',
              'TimeSheet',
              'ToDoLogoBottom',
              'ToDoLogoInverse',
              'ToDoLogoTop',
              'ToggleBorder',
              'ToggleFilled',
              'ToggleOff',
              'ToggleThumb',
              'Toll',
              'Touch',
              'TouchPointer',
              'Trackers',
              'TrackersMirrored',
              'Train',
              'TrainSolid',
              'TransferCall',
              'Transition',
              'TransitionEffect',
              'TransitionPop',
              'TransitionPush',
              'Trending12',
              'TriangleDown12',
              'TriangleLeft12',
              'TriangleRight12',
              'TriangleShapeSolid',
              'TriangleSolid',
              'TriangleSolidDown12',
              'TriangleSolidLeft12',
              'TriangleSolidRight12',
              'TriangleSolidUp12',
              'TriangleUp12',
              'TriggerApproval',
              'TriggerAuto',
              'TriggerUser',
              'TripleColumn',
              'TripleColumnEdit',
              'Trophy',
              'Trophy2',
              'Trophy2Solid',
              'TurnRight',
              'TVMonitor',
              'TVMonitorSelected',
              'TypeScriptLanguage',
              'Umbrella',
              'Underline',
              'Undo',
              'Uneditable',
              'UneditableMirrored',
              'UneditableSolid12',
              'UneditableSolidMirrored12',
              'Unfavorite',
              'UngroupObject',
              'Unknown',
              'UnknownCall',
              'UnknownMirrored',
              'UnknownMirroredSolid',
              'UnknownSolid',
              'Unlock',
              'UnlockSolid',
              'Unpin',
              'Unsubscribe',
              'UnsyncFolder',
              'UnsyncOccurence',
              'Up',
              'Upload',
              'UserEvent',
              'UserFollowed',
              'UserPause',
              'UserRemove',
              'UserSync',
              'Vacation',
              'Variable',
              'VariableGroup',
              'VB',
              'VennDiagram',
              'VersionControlPush',
              'VerticalDistributeCenter',
              'Video',
              'VideoOff',
              'VideoSearch',
              'VideoSolid',
              'View',
              'ViewAll',
              'ViewAll2',
              'ViewDashboard',
              'ViewList',
              'ViewListGroup',
              'ViewListTree',
              'VisioDiagram',
              'VisioDocument',
              'VisioLogo',
              'VisioLogo16',
              'VisioLogoFill',
              'VisioLogoFill16',
              'VisioLogoInverse',
              'VisioLogoInverse16',
              'VisualBasicLanguage',
              'VisualsFolder',
              'VisualsStore',
              'VisualStudioIDELogo32',
              'VisualStudioLogo',
              'VoicemailForward',
              'VoicemailIRM',
              'VoicemailReply',
              'Volume0',
              'Volume1',
              'Volume2',
              'Volume3',
              'VolumeDisabled',
              'VSTSAltLogo1',
              'VSTSAltLogo2',
              'VSTSLogo',
              'Waffle',
              'WaffleOffice365',
              'WaitlistConfirm',
              'WaitlistConfirmMirrored',
              'Warning',
              'Warning12',
              'WebPublish',
              'Website',
              'Weights',
              'WhiteBoardApp16',
              'WhiteBoardApp32',
              'WifiEthernet',
              'WindDirection',
              'WindowEdit',
              'WindowsLogo',
              'Wines',
              'WipePhone',
              'WordDocument',
              'WordLogo',
              'WordLogo16',
              'WordLogoFill',
              'WordLogoFill16',
              'WordLogoInverse',
              'WordLogoInverse16',
              'Work',
              'WorkFlow',
              'WorkforceManagement',
              'WorkItem',
              'WorkItemBar',
              'WorkItemBarSolid',
              'WorkItemBug',
              'World',
              'WorldClock',
              'YammerLogo',
              'ZipFolder',
              'Zoom',
              'ZoomIn',
              'ZoomOut'
          ];
      })(fabric || (fabric = {}));
      // #endreg

      // #region office UI fabric
      /**
     * Office UI fabric JS 1.4.0
     * The JavaScript front-end framework for building experiences for Office 365.
     **/
      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // "use strict";
      var fabric;
      (function(fabric) {
          var SCROLL_FRAME_RATE = 33;
          var Animate = (function() {
              function Animate() {}
              /**
         * @param {HTMLElement} element
         * @param {object} props Transition properties
         * @param {number} props.duration The duration of the transition in seconds
         * @param {number} props.delay A delay in seconds that occurs before the transition starts
         * @param {string} props.ease An easing equation applied to the transition
         * @param {function} props.onEnd A function that is called when the transition ends
         * @param {array} props.onEndArgs An array of parameters applied to the onEnd function
         * @param {number} props.x props.y props.left, props.opacity etc... CSS values to transition to
         */
              Animate.transition = function(element, props) {
                  var obj = { element: element, props: props, transformations: {} };
                  Animate._animationObjects.push(obj);
                  Animate._parseProperties(obj);
                  Animate._createTransition(obj);
                  setTimeout(Animate._setProperties, 0, obj);
                  Animate._setCallback(obj);
              };
              /**
         * @param {HTMLElement} element
         * @param {string} keyframes A name of a keyframe animation
         * @param {object} props Animation properties
         * @param {number} props.duration The duration of the animation in seconds
         * @param {number} props.delay A delay in seconds that occurs before the animation starts
         * @param {string} props.ease An easing equation applied to the animation
         * @param {function} props.onEnd A function that is called when the animation ends
         * @param {array} props.onEndArgs An array of parameters applied to the onEnd function
         */
              Animate.animation = function(element, keyframes, props) {
                  var obj = { element: element, keyframes: keyframes, props: props };
                  Animate._animationObjects.push(obj);
                  Animate._parseProperties(obj);
                  Animate._createAnimation(obj);
                  Animate._setCallback(obj);
              };
              /**
         * @param {HTMLElement} element
         * @param {object} props Scroll animation properties
         * @param {number} props.duration The duration of the transition in seconds
         * @param {number} props.top The end scroll position of the element
         * @param {number} props.delay A delay in seconds that occurs before the scroll starts
         * @param {function} props.onEnd A function that is called when the scrolling animation ends
         * @param {array} props.onEndArgs An array of parameters applied to the onEnd function
         */
              Animate.scrollTo = function(element, props) {
                  var obj = { element: element, props: props, step: 0 };
                  Animate._setScrollProperties(obj);
                  if (obj.props.delay) {
                      setTimeout(Animate._animationObjects, obj.props.delay * 1000, obj);
                  } else {
                      Animate._animateScroll(obj);
                  }
                  Animate._animationObjects.push(obj);
              };
              Animate._setScrollProperties = function(obj) {
                  obj.beginTop = obj.element.scrollTop;
                  obj.change = obj.props.top - obj.beginTop;
                  obj.props.duration = obj.props.duration * 1000;
              };
              Animate._parseProperties = function(obj) {
                  var nonTweenProps = Animate._timeProps.concat(Animate._callbackProps);
                  obj.tweenObj = {};
                  for (var key in obj.props) {
                      if (Animate._contains(nonTweenProps, key)) {
                          obj[key] = obj.props[key];
                      } else {
                          obj.tweenObj[key] = obj.props[key];
                      }
                  }
              };
              Animate._animateScroll = function(obj) {
                  var totalSteps = obj.props.duration / SCROLL_FRAME_RATE;
                  var top = Animate._easeOutExpo(obj.step++, obj.beginTop, obj.change, totalSteps);
                  obj.element.scrollTop = top;
                  if (obj.step >= totalSteps) {
                      obj.element.scrollTop = obj.props.top;
                      Animate._executeCallback(obj.props);
                      Animate._removeAnimationObject(obj);
                  } else {
                      setTimeout(function() {
                          requestAnimationFrame(function() {
                              Animate._animateScroll(obj);
                          });
                      }, SCROLL_FRAME_RATE);
                  }
              };
              Animate._createTransition = function(obj) {
                  var duration = obj.duration || 0;
                  var delay = obj.delay || 0;
                  obj.element.style.transitionProperty = Animate._getTransitionProperties(obj.tweenObj);
                  obj.element.style.transitionDuration = duration.toString() + 's';
                  obj.element.style.transitionTimingFunction = obj.ease || 'linear';
                  obj.element.style.transitionDelay = delay.toString() + 's';
              };
              Animate._createAnimation = function(obj) {
                  var duration = obj.duration || 0;
                  var delay = obj.delay || 0;
                  obj.element.style.animationName = obj.keyframes;
                  obj.element.style.animationDuration = duration.toString() + 's';
                  obj.element.style.animationTimingFunction = obj.ease || 'linear';
                  obj.element.style.animationDelay = delay.toString() + 's';
                  obj.element.style.animationFillMode = 'both';
              };
              Animate._getTransitionProperties = function(obj) {
                  var hasTransform = false;
                  var hasFilter = false;
                  var properties = [];
                  for (var key in obj) {
                      if (Animate._contains(Animate._transformProps, key)) {
                          hasTransform = true;
                      } else if (Animate._contains(Animate._filters, key)) {
                          hasFilter = true;
                      } else {
                          properties.push(Animate._camelCaseToDash(key));
                      }
                  }
                  if (hasTransform) {
                      properties.push('transform');
                  }
                  if (hasFilter) {
                      properties.push('-webkit-filter');
                      properties.push('filter');
                  }
                  return properties.join(', ');
              };
              Animate._setProperties = function(obj) {
                  for (var key in obj.tweenObj) {
                      if (Animate._contains(Animate._transformProps, key)) {
                          Animate._setTransformValues(obj, key);
                      } else if (Animate._contains(Animate._filters, key)) {
                          Animate._setFilterValues(obj, key);
                      } else {
                          Animate._setRegularValues(obj, key);
                      }
                  }
                  if (obj.transformations) {
                      Animate._setTransformations(obj);
                  }
              };
              Animate._setRegularValues = function(obj, key) {
                  var value = obj.tweenObj[key];
                  if (value.toString().indexOf('%') === -1) {
                      value += key !== 'opacity' && key !== 'backgroundColor' && key !== 'boxShadow' ? 'px' : '';
                  }
                  obj.element.style[key] = value;
              };
              Animate._setFilterValues = function(obj, key) {
                  var value = obj.tweenObj[key];
                  if (key === 'hueRotate') {
                      value = '(' + value + 'deg)';
                  } else {
                      value = key === 'blur' ? '(' + value + 'px)' : '(' + value + '%)';
                  }
                  key = Animate._camelCaseToDash(key);
                  obj.element.style.webkitFilter = key + value;
                  obj.element.style.filter = key + value;
              };
              Animate._setTransformValues = function(obj, key) {
                  if (/x|y|z|scaleX|scaleY|scaleZ|rotate|rotateX|rotateY|rotateZ|skewX|skewY/.test(key)) {
                      obj.transformations[key] = obj.tweenObj[key];
                  }
              };
              Animate._setTransformations = function(obj) {
                  var rotate = '';
            var scale = '';
            var skew = '';
            var translate = '';
                  var trans = obj.transformations;
                  translate += trans.x !== undefined && trans.x ? 'translateX(' + trans.x + 'px) ' : '';
                  translate += trans.y !== undefined && trans.y ? 'translateY(' + trans.y + 'px) ' : '';
                  translate += trans.z !== undefined && trans.z ? 'translateZ(' + trans.z + 'px) ' : '';
                  rotate += trans.rotate !== undefined && trans.rotate ? 'rotate(' + trans.rotate + 'deg) ' : '';
                  rotate += trans.rotateX !== undefined && trans.rotateX ? 'rotateX(' + trans.rotateX + 'deg) ' : '';
                  rotate += trans.rotateY !== undefined && trans.rotateY ? 'rotate(' + trans.rotateY + 'deg) ' : '';
                  rotate += trans.rotateZ !== undefined && trans.rotateZ ? 'rotate(' + trans.rotateZ + 'deg) ' : '';
                  scale += trans.scaleX !== undefined && trans.scaleX ? 'scaleX(' + trans.scaleX + ') ' : '';
                  scale += trans.scaleY !== undefined && trans.scaleY ? 'scaleY(' + trans.scaleY + ') ' : '';
                  scale += trans.scaleZ !== undefined && trans.scaleZ ? 'scaleZ(' + trans.scaleZ + ') ' : '';
                  skew += trans.skewX !== undefined && trans.skewX ? 'skewX(' + trans.skewX + 'deg) ' : '';
                  skew += trans.skewY !== undefined && trans.skewY ? 'skewY(' + trans.skewY + 'deg) ' : '';
                  obj.element.style.transform = translate + rotate + scale + skew;
              };
              Animate._setCallback = function(obj) {
                  obj.element.addEventListener('webkitTransitionEnd', Animate._complete, false);
                  obj.element.addEventListener('transitionend', Animate._complete, false);
                  obj.element.addEventListener('webkitAnimationEnd', Animate._complete, false);
                  obj.element.addEventListener('animationend', Animate._complete, false);

                  // viizCom: ensure Animate._complete is being called...
                  try {
                      var duration_safe = (obj.props && typeof obj.props.duration === 'number' && obj.props.duration) || 0;
                      var delay_safe = (obj.props && typeof obj.props.delay === 'number' && obj.props.delay) || 0;
                      var timeToWait = (duration_safe + delay_safe) * 1000 + 200; // A bit after animation should have finished
                      obj.EnsureCompleteTimeout = window.setTimeout(Animate._complete, timeToWait, { target: obj.element });
                  } catch (e) {}
              };
              Animate._complete = function(event) {
                  event.target.removeEventListener('webkitTransitionEnd', Animate._complete);
                  event.target.removeEventListener('transitionend', Animate._complete);
                  event.target.removeEventListener('webkitAnimationEnd', Animate._complete);
                  event.target.removeEventListener('animationend', Animate._complete);
                  var obj = Animate._getAnimationObjByElement(event.target);

                  // viizCom: ensure Animate._complete is being called... using EnsureCompleteTimeout and CompleteCalled flags
                  if (obj.EnsureCompleteTimeout) {
                      window.clearTimeout(obj.EnsureCompleteTimeout);
                      obj.EnsureCompleteTimeout = null;
                  }
                  if (obj.CompleteCalled !== true) {
                      obj.CompleteCalled = true;
                      Animate._executeCallback(obj);
                      Animate._removeAnimationObject(obj);
                  }
              };
              Animate._getAnimationObjByElement = function(element) {
                  var i = Animate._animationObjects.length;
                  while (i--) {
                      if (Animate._animationObjects[i].element === element) {
                          return Animate._animationObjects[i];
                      }
                  }
                  return null;
              };
              Animate._removeAnimationObject = function(obj) {
                  var i = Animate._animationObjects.length;
                  while (i--) {
                      if (Animate._animationObjects[i] === obj) {
                          Animate._animationObjects.splice(i, 1);
                      }
                  }
              };
              Animate._executeCallback = function(obj) {
                  if (obj.onEnd) {
                      var endArgs = obj.onEndArgs || [];
                      obj.onEnd.apply(null, endArgs);
                  }
              };
              Animate._contains = function(array, value) {
                  var i = array.length;
                  while (i--) {
                      if (value === array[i]) {
                          return true;
                      }
                  }
                  return false;
              };
              Animate._camelCaseToDash = function(value) {
                  return value
                      .replace(/\W+/g, '-')
                      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
                      .toLowerCase();
              };
              Animate._easeOutExpo = function(time, begin, change, duration) {
                  return time === duration ? begin + change : change * (-Math.pow(2, (-10 * time) / duration) + 1) + begin;
              };
              Animate._transformProps = ['x', 'y', 'z', 'scaleX', 'scaleY', 'scaleZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY'];
              Animate._filters = ['blur', 'brightness', 'contrast', 'dropShadow', 'grayscale', 'hueRotate', 'invert', 'saturate', 'sepia'];
              Animate._timeProps = ['duration', 'ease', 'delay'];
              Animate._callbackProps = ['onEnd', 'onEndArgs'];
              Animate._animationObjects = [];
              return Animate;
          })();
          fabric.Animate = Animate;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // "use strict";
      var fabric;
      (function(fabric) {
          var Ease = (function() {
              function Ease() {}
              Ease.QUAD_EASE_IN = Ease.CB + '(0.550, 0.085, 0.680, 0.530)';
              Ease.CUBIC_EASE_IN = Ease.CB + '(0.550, 0.055, 0.675, 0.190)';
              Ease.QUART_EASE_IN = Ease.CB + '(0.895, 0.030, 0.685, 0.220)';
              Ease.QUINT_EASE_IN = Ease.CB + '(0.755, 0.050, 0.855, 0.060)';
              Ease.SINE_EASE_IN = Ease.CB + '(0.470, 0, 0.745, 0.715)';
              Ease.EXPO_EASE_IN = Ease.CB + '(0.950, 0.050, 0.795, 0.035)';
              Ease.CIRC_EASE_IN = Ease.CB + '(0.600, 0.040, 0.980, 0.335)';
              Ease.BACK_EASE_IN = Ease.CB + '(0.600, 0.040, 0.980, 0.335)';
              Ease.QUAD_EASE_OUT = Ease.CB + '(0.250, 0.460, 0.450, 0.940)';
              Ease.CUBIC_EASE_OUT = Ease.CB + '(0.215, 0.610, 0.355, 1)';
              Ease.QUART_EASE_OUT = Ease.CB + '(0.165, 0.840, 0.440, 1)';
              Ease.QUINT_EASE_OUT = Ease.CB + '(0.230, 1, 0.320, 1)';
              Ease.SINE_EASE_OUT = Ease.CB + '(0.390, 0.575, 0.565, 1)';
              Ease.EXPO_EASE_OUT = Ease.CB + '(0.190, 1, 0.220, 1)';
              Ease.CIRC_EASE_OUT = Ease.CB + '(0.075, 0.820, 0.165, 1)';
              Ease.BACK_EASE_OUT = Ease.CB + '(0.175, 0.885, 0.320, 1.275)';
              Ease.QUAD_EASE_IN_OUT = Ease.CB + '(0.455, 0.030, 0.515, 0.955)';
              Ease.CUBIC_EASE_IN_OUT = Ease.CB + '(0.645, 0.045, 0.355, 1)';
              Ease.QUART_EASE_IN_OUT = Ease.CB + '(0.770, 0, 0.175, 1)';
              Ease.QUINT_EASE_IN_OUT = Ease.CB + '(0.860, 0, 0.070, 1)';
              Ease.SINE_EASE_IN_OUT = Ease.CB + '(0.445, 0.050, 0.550, 0.950)';
              Ease.EXPO_EASE_IN_OUT = Ease.CB + '(1, 0, 0, 1)';
              Ease.CIRC_EASE_IN_OUT = Ease.CB + '(0.785, 0.135, 0.150, 0.860)';
              Ease.BACK_EASE_IN_OUT = Ease.CB + '(0.680, -0.550, 0.265, 1.550)';
              Ease.CB = 'cubic-bezier';
              return Ease;
          })();
          fabric.Ease = Ease;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // "use strict";
      // CustomEvent Polyfill to support IE
      (function() {
          function CustomEvent(event, params) {
              params = params || { bubbles: false, cancelable: false, detail: undefined };
              var evt = document.createEvent('CustomEvent');
              evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
              return evt;
          }
          CustomEvent.prototype = Event.prototype;
          window.CustomEvent = CustomEvent;
      })();

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * Button
     *
     * Mostly just a click handler
     *
     */
      var fabric;
      (function(fabric) {
          'use strict';
          var Button = (function() {
              function Button(container, clickHandler) {
                  this._container = container;
                  if (clickHandler) {
                      this._clickHandler = clickHandler;
                      this._setClick();
                  }
              }
              Button.prototype.disposeEvents = function() {
                  this._container.removeEventListener('click', this._clickHandler, false);
              };
              Button.prototype._setClick = function() {
                  this._container.addEventListener('click', this._clickHandler, false);
              };
              return Button;
          })();
          fabric.Button = Button;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
          'use strict';
          /**
       * Breadcrumb component
       *
       * Shows the user"s current location in a hierarchy and provides a means of navigating upward.
       *
       */
          var Breadcrumb = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Breadcrumb
         * @constructor
         *
         * If dynamically populating a list run the constructor after the list has been populated
         * in the DOM.
         */
              function Breadcrumb(container) {
                  this._currentMaxItems = 0;
                  this._itemCollection = [];
                  this._tabIndex = 2;
                  this.container = container;
                  this._onResize = this._onResize.bind(this);
                  this._openOverflow = this._openOverflow.bind(this);
                  this._overflowKeyPress = this._overflowKeyPress.bind(this);
                  this._closeOverflow = this._closeOverflow.bind(this);
                  this.removeOutlinesOnClick = this.removeOutlinesOnClick.bind(this);
                  this.init();
              }
              /**
         *  removes focus outlines so they don"t linger after click
         */
              Breadcrumb.prototype.removeOutlinesOnClick = function() {
                  this._breadcrumbList.blur();
              };
              /**
         * Adds a breadcrumb item to a breadcrumb
         * @param itemLabel {String} the item's text label
         * @param itemLink {String} the item's href link
         */
              Breadcrumb.prototype.addItem = function(itemLabel, itemLink) {
                  this._itemCollection.push({ text: itemLabel, link: itemLink });
                  this._updateBreadcrumbs();
              };
              /**
         * Removes a breadcrumb item by item label in the breadcrumbs list
         * @param itemLabel {String} the item's text label
         */
              Breadcrumb.prototype.removeItemByLabel = function(itemLabel) {
                  var i = this._itemCollection.length;
                  while (i--) {
                      if (this._itemCollection[i].text === itemLabel) {
                          this._itemCollection.splice(i, 1);
                      }
                  }
                  this._updateBreadcrumbs();
              };
              /**
         * removes a breadcrumb item by position in the breadcrumb's list
         * index starts at 0
         * @param value {number} the item's index
         */
              Breadcrumb.prototype.removeItemByPosition = function(value) {
                  this._itemCollection.splice(value, 1);
                  this._updateBreadcrumbs();
              };
              /**
         * initializes component
         */
              Breadcrumb.prototype.init = function() {
                  this._cacheDOM();
                  this._setListeners();
                  this._createItemCollection();
                  this._onResize();
              };
              /**
         * create internal model of list items from DOM
         */
              Breadcrumb.prototype._createItemCollection = function() {
                  var length = this._listItems.length;
                  var i = 0;
                  var item;
                  var text;
                  var link;
                  var tabIndex;
                  for (i; i < length; i++) {
                      item = this._listItems[i].querySelector('.vi-Breadcrumb-itemLink');
                      text = item.textContent;
                      link = item.getAttribute('href');
                      tabIndex = parseInt(item.getAttribute('tabindex'), 10);
                      this._itemCollection.push({ link: link, tabIndex: tabIndex, text: text });
                  }
              };
              /**
         * Re-render lists on resize
         *
         */
              Breadcrumb.prototype._onResize = function() {
                  this._closeOverflow(null);
                  this._renderList();
              };
              /**
         * render breadcrumbs and overflow menus
         */
              Breadcrumb.prototype._renderList = function() {
                  var maxItems = window.innerWidth > Breadcrumb.MEDIUM ? 4 : 2;
                  if (maxItems !== this._currentMaxItems) {
                      this._updateBreadcrumbs();
                  }
                  this._currentMaxItems = maxItems;
              };
              /**
         * updates the breadcrumbs and overflow menu
         */
              Breadcrumb.prototype._updateBreadcrumbs = function() {
                  this._tabIndex = 2;
                  var maxItems = window.innerWidth > Breadcrumb.MEDIUM ? 4 : 2;
                  if (this._itemCollection.length > maxItems) {
                      this._breadcrumb.classList.add('is-overflow');
                  } else {
                      this._breadcrumb.classList.remove('is-overflow');
                  }
                  this._addItemsToOverflow(maxItems);
                  this._addBreadcrumbItems(maxItems);
              };
              /**
         * creates the overflow menu
         */
              Breadcrumb.prototype._addItemsToOverflow = function(maxItems) {
                  var _this = this;
                  this._resetList(this._contextMenu);
                  var end = this._itemCollection.length - maxItems;
                  var overflowItems = this._itemCollection.slice(0, end);
                  overflowItems.forEach(function(item) {
                      var li = document.createElement('li');
                      li.className = 'vi-ContextualMenu-item';
                      var a = document.createElement('a');
                      a.className = 'vi-ContextualMenu-link';
                      if (item.link !== null) {
                          a.setAttribute('href', item.link);
                      }
                      a.setAttribute('tabindex', (_this._tabIndex++).toString());
                      a.textContent = item.text;
                      li.appendChild(a);
                      _this._contextMenu.appendChild(li);
                  });
              };
              /**
         * creates the breadcrumbs
         */
              Breadcrumb.prototype._addBreadcrumbItems = function(maxItems) {
                  this._resetList(this._breadcrumbList);
                  var i = this._itemCollection.length - maxItems;
                  i = i < 0 ? 0 : i;
                  if (i >= 0) {
                      for (i; i < this._itemCollection.length; i++) {
                          var listItem = document.createElement('li');
                          var item = this._itemCollection[i];
                          var a = document.createElement('a');
                          var chevron = document.createElement('i');
                          listItem.className = 'vi-Breadcrumb-listItem';
                          a.className = 'vi-Breadcrumb-itemLink';
                          if (item.link !== null) {
                              a.setAttribute('href', item.link);
                          }
                          a.setAttribute('tabindex', (this._tabIndex++).toString());
                          a.textContent = item.text;
                          chevron.className = 'vi-Breadcrumb-chevron vi-Icon vi-Icon--ChevronRight';
                          listItem.appendChild(a);
                          listItem.appendChild(chevron);
                          this._breadcrumbList.appendChild(listItem);
                      }
                  }
              };
              /**
         * resets a list by removing its children
         */
              Breadcrumb.prototype._resetList = function(list) {
                  while (list.firstChild) {
                      list.removeChild(list.firstChild);
                  }
              };
              /**
         * opens the overflow menu
         */
              Breadcrumb.prototype._openOverflow = function(event) {
                  if (this._overflowMenu.className.indexOf(' is-open') === -1) {
                      this._overflowMenu.classList.add('is-open');
                      this.removeOutlinesOnClick();
                      // force focus rect onto overflow button
                      this._overflowButton.focus();
                  }
              };
              Breadcrumb.prototype._overflowKeyPress = function(event) {
                  if (event.keyCode === 13) {
                      this._openOverflow(event);
                  }
              };
              /**
         * closes the overflow menu
         */
              Breadcrumb.prototype._closeOverflow = function(event) {
                  if (!event || event.target !== this._overflowButton) {
                      this._overflowMenu.classList.remove('is-open');
                  }
              };
              /**
         * caches elements and values of the component
         */
              Breadcrumb.prototype._cacheDOM = function() {
                  this._breadcrumb = this.container;
                  this._breadcrumbList = this._breadcrumb.querySelector('.vi-Breadcrumb-list');
                  this._listItems = this._breadcrumb.querySelectorAll('.vi-Breadcrumb-listItem');
                  this._contextMenu = this._breadcrumb.querySelector('.vi-ContextualMenu');
                  this._overflowButton = this._breadcrumb.querySelector('.vi-Breadcrumb-overflowButton');
                  this._overflowMenu = this._breadcrumb.querySelector('.vi-Breadcrumb-overflowMenu');
              };
              /**
         * sets handlers for resize and button click events
         */
              Breadcrumb.prototype._setListeners = function() {
                  window.addEventListener('resize', this._onResize, false);
                  this._overflowButton.addEventListener('click', this._openOverflow, false);
                  this._overflowButton.addEventListener('keypress', this._overflowKeyPress, false);
                  document.addEventListener('click', this._closeOverflow, false);
                  this._breadcrumbList.addEventListener('click', this.removeOutlinesOnClick, false);
              };
              // medium breakpoint
              Breadcrumb.MEDIUM = 639;
              return Breadcrumb;
          })();
          fabric.Breadcrumb = Breadcrumb;
      })(fabric || (fabric = {})); // end fabric namespace

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * ContextualHost
     *
     * Hosts contextual menus and callouts
     * NOTE: Position bottom only works if html is set to max-height 100%, overflow hidden
     * and body is set to overflow scroll, body is set to height 100%
     *
     */
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
      /**
       *
       * @constructor
       */
          var CONTEXT_STATE_CLASS = 'is-open';
          var MODAL_STATE_POSITIONED = 'is-positioned';
          var CONTEXT_HOST_MAIN_CLASS = 'vi-ContextualHost-main';
          var CONTEXT_HOST_BEAK_CLASS = 'vi-ContextualHost-beak';
          var ARROW_LEFT_CLASS = 'vi-ContextualHost--arrowLeft';
          var ARROW_TOP_CLASS = 'vi-ContextualHost--arrowTop';
          var ARROW_BOTTOM_CLASS = 'vi-ContextualHost--arrowBottom';
          var ARROW_RIGHT_CLASS = 'vi-ContextualHost--arrowRight';
          var MODIFIER_BASE = 'vi-ContextualHost--';
          var ARROW_SIZE = 28;
          var ARROW_OFFSET = 8;
          var ContextualHost = (function() {
              function ContextualHost(content, direction, targetElement, hasArrow, modifiers, matchTargetWidth, disposalCallback) {
                  // viizcom: make sure we bring it back to where it was when closing... otherwise if it is rendered with KO bindings will be out of sync
                  this._content = content;
                  this._contentOriginalParent = content.parentNode;
                  // end viizcom

                  if (hasArrow === void 0) {
                      hasArrow = true;
                  }
                  this._resizeAction = this._resizeAction.bind(this);
                  this._dismissAction = this._dismissAction.bind(this);
                  this._handleKeyUpDismiss = this._handleKeyUpDismiss.bind(this);
                  this._matchTargetWidth = matchTargetWidth || false;
                  this._direction = direction;
                  this._allowCenterPosition = !this._content.classList.contains('keep-position'); // viizcom:change to false to prevent big context menus from opening center screen
                  this._container = this.createContainer();
                  this._contextualHost = this._container;
                  this._contextualHostMain = this._contextualHost.getElementsByClassName(CONTEXT_HOST_MAIN_CLASS)[0];
                  this._contextualHostMain.appendChild(this._content);
                  this._hasArrow = hasArrow;
                  this._arrow = this._container.getElementsByClassName(CONTEXT_HOST_BEAK_CLASS)[0];
                  this._targetElement = targetElement;
                  this._openModal();
                  this._setResizeDisposal();
                  if (disposalCallback) {
                      this._disposalCallback = disposalCallback;
                  }
                  if (modifiers) {
                      for (var i = 0; i < modifiers.length; i++) {
                          this._container.classList.add(MODIFIER_BASE + modifiers[i]);
                      }
                  }
                  if (!ContextualHost.hosts) {
                      ContextualHost.hosts = [];
                  }
                  ContextualHost.hosts.push(this);
              }
              ContextualHost.prototype.disposeModal = function() {
                  if (ContextualHost.hosts.length > 0) {
                      window.removeEventListener('resize', this._resizeAction, false);
                      document.removeEventListener('click', this._dismissAction, true);
                      document.removeEventListener('keyup', this._handleKeyUpDismiss, true);

                      // viizcom: make sure we bring it back to where it was when closing... otherwise if it is rendered with KO bindings will be out of sync
                      if (this._content && this._contentOriginalParent) {
                          // re-add the hidden class to the callout when the contextual host is closed.
                          this._content.classList.add('is-hidden');
                          this._contentOriginalParent.appendChild(this._content);
                      }
                      // end viizcom

                      this._container.parentNode && this._container.parentNode.removeChild(this._container); // viizcom: bug, this sometimes gets called when container has no parent node.
                      if (this._disposalCallback) {
                          this._disposalCallback();
                      }
                      // Dispose of all ContextualHosts
                      var index = ContextualHost.hosts.indexOf(this);
                      ContextualHost.hosts.splice(index, 1);
                      var i = ContextualHost.hosts.length;
                      while (i-- && i < ContextualHost.hosts.length) {
                          // viizcom added && i < ContextualHost.hosts.length condition, in some cases the host was disposed twice
                          ContextualHost.hosts[i].disposeModal();
                          ContextualHost.hosts.splice(i, 1);
                      }
                  }
              };
              ContextualHost.prototype.setChildren = function(value) {
                  if (!this._children) {
                      this._children = [];
                  }
                  this._children.push(value);
              };
              ContextualHost.prototype.contains = function(value) {
                  return this._container.contains(value);
              };
              ContextualHost.prototype.createContainer = function() {
                  var ContextualHost0 = document.createElement('div');
                  ContextualHost0.setAttribute('class', 'vi-ContextualHost');
                  ContextualHost0.innerHTML += ' ';
                  var ContextualHost0c1 = document.createElement('div');
                  ContextualHost0c1.setAttribute('class', CONTEXT_HOST_MAIN_CLASS);
                  ContextualHost0c1.innerHTML += ' ';
                  ContextualHost0.appendChild(ContextualHost0c1);
                  ContextualHost0.innerHTML += ' ';
                  var ContextualHost0c3 = document.createElement('div');
                  ContextualHost0c3.setAttribute('class', CONTEXT_HOST_BEAK_CLASS);
                  ContextualHost0.appendChild(ContextualHost0c3);
                  ContextualHost0.innerHTML += '';
                  return ContextualHost0;
              };
              ContextualHost.prototype._openModal = function() {
                  var _this = this;
                  this._copyModalToBody();
                  this._saveModalSize();
                  this._findAvailablePosition();
                  this._showModal();
                  // Delay the click setting
                  setTimeout(function() {
                      _this._setDismissClick();
                  }, 100);
              };
              ContextualHost.prototype._findAvailablePosition = function() {
                  var _posOk;
                  switch (this._direction) {
                  case 'left':
                      // Try the right side
                      _posOk = this._positionOk(
                          this._tryPosModalLeft.bind(this),
                          this._tryPosModalRight.bind(this),
                          this._tryPosModalBottom.bind(this),
                          this._tryPosModalTop.bind(this)
                      );
                      this._setPosition(_posOk);
                      break;
                  case 'right':
                      _posOk = this._positionOk(
                          this._tryPosModalRight.bind(this),
                          this._tryPosModalLeft.bind(this),
                          this._tryPosModalBottom.bind(this),
                          this._tryPosModalTop.bind(this)
                      );
                      this._setPosition(_posOk);
                      break;
                  case 'top':
                      _posOk = this._positionOk(this._tryPosModalTop.bind(this), this._tryPosModalBottom.bind(this));
                      this._setPosition(_posOk);
                      break;
                  case 'bottom':
                      _posOk = this._positionOk(this._tryPosModalBottom.bind(this), this._tryPosModalTop.bind(this));
                      this._setPosition(_posOk);
                      break;
                  default:
                      this._setPosition();
                  }
              };
              ContextualHost.prototype._showModal = function() {
                  this._container.classList.add(CONTEXT_STATE_CLASS);
              };
              ContextualHost.prototype._positionOk = function(pos1, pos2, pos3, pos4) {
                  var _posOk;
                  _posOk = pos1();
                  if (!_posOk) {
                      _posOk = pos2();
                      if (!_posOk && pos3) {
                          _posOk = pos3();
                          if (!_posOk && pos4) {
                              _posOk = pos4();
                          }
                      }
                  }
                  return _posOk;
              };
              ContextualHost.prototype._calcLeft = function(mWidth, teWidth, teLeft) {
                  var mHalfWidth = mWidth / 2;
                  var teHalf = teWidth / 2;
                  var mHLeft = teLeft + teHalf - mHalfWidth;
                  mHLeft = mHLeft < mHalfWidth ? teLeft : mHLeft;
                  return mHLeft;
              };
              ContextualHost.prototype._calcTop = function(mHeight, teHeight, teTop) {
                  var mHalfWidth = mHeight / 2;
                  var teHalf = teHeight / 2;
                  var mHLeft = teTop + teHalf - mHalfWidth;
                  mHLeft = mHLeft < mHalfWidth ? teTop : mHLeft;
                  return mHLeft;
              };
              ContextualHost.prototype._setPosition = function(curDirection) {
                  var teBR = this._targetElement.getBoundingClientRect();
                  var teLeft = teBR.left;
                  var teRight = teBR.right;
                  var teTop = teBR.top;
                  var teWidth = teBR.width;
                  var teHeight = teBR.height;
                  var mHLeft;
                  var mHTop;
                  var mWidth = '';
                  var arrowTop;
                  var arrowLeft;
                  var windowX = window.scrollX ? window.scrollX : 0;
                  var windowY = window.scrollY ? window.scrollY : 0;
                  var arrowSpace = this._hasArrow ? ARROW_SIZE : 0;
                  if (this._matchTargetWidth) {
                      mWidth = 'width: ' + this._modalWidth + 'px;';
                  }

                  if (!curDirection && !this._allowCenterPosition) curDirection = this._direction; // force original location.

                  switch (curDirection) {
                  case 'left':
                      mHLeft = teLeft - this._modalWidth - arrowSpace;
                      mHTop = this._calcTop(this._modalHeight, teHeight, teTop);
                      mHTop += window.scrollY ? window.scrollY : 0;

                      this._container.setAttribute('style', 'top: ' + mHTop + 'px; left: ' + mHLeft + 'px;' + mWidth);
                      this._container.classList.add(MODAL_STATE_POSITIONED);
                      if (this._hasArrow) {
                          this._container.classList.add(ARROW_RIGHT_CLASS);
                          arrowTop = teTop + windowY - mHTop + ARROW_OFFSET;
                          this._arrow.setAttribute('style', 'top: ' + arrowTop + 'px;');
                      }
                      break;
                  case 'right':
                      mHTop = this._calcTop(this._modalHeight, teHeight, teTop);
                      mHTop += windowY;
                      mHLeft = teRight + arrowSpace;

                      this._container.setAttribute('style', 'top: ' + mHTop + 'px; left: ' + mHLeft + 'px;' + mWidth);
                      this._container.classList.add(MODAL_STATE_POSITIONED);
                      if (this._hasArrow) {
                          arrowTop = windowY + teTop - mHTop + ARROW_OFFSET;
                          this._arrow.setAttribute('style', 'top: ' + arrowTop + 'px;');
                          this._container.classList.add(ARROW_LEFT_CLASS);
                      }
                      break;
                  case 'top':
                      mHLeft = this._calcLeft(this._modalWidth, this._teWidth, teLeft);
                      mHTop = teTop - this._modalHeight - arrowSpace;
                      mHTop += windowY;

                      this._container.setAttribute('style', 'top: ' + mHTop + 'px; left: ' + mHLeft + 'px;' + mWidth);
                      this._container.classList.add(MODAL_STATE_POSITIONED);
                      if (this._hasArrow) {
                          arrowTop = this._modalHeight - arrowSpace / 2;
                          arrowLeft = Math.max(windowX + teLeft - mHLeft + (teWidth - arrowSpace) / 2, ARROW_OFFSET);
                          this._arrow.setAttribute('style', 'top: ' + arrowTop + 'px; left: ' + arrowLeft + 'px;');
                          this._container.classList.add(ARROW_BOTTOM_CLASS);
                      }
                      break;
                  case 'bottom':
                      mHLeft = this._calcLeft(this._modalWidth, this._teWidth, teLeft);
                      mHTop = teTop + teHeight + arrowSpace;
                      mHTop += window.scrollY ? window.scrollY : 0;

                      this._container.setAttribute('style', 'top: ' + mHTop + 'px; left: ' + mHLeft + 'px;' + mWidth);
                      this._container.classList.add(MODAL_STATE_POSITIONED);
                      if (this._hasArrow) {
                          arrowLeft = Math.max(windowX + teLeft - mHLeft + (teWidth - arrowSpace) / 2, ARROW_OFFSET);
                          this._arrow.setAttribute('style', 'left: ' + arrowLeft + 'px;');
                          this._container.classList.add(ARROW_TOP_CLASS);
                      }
                      break;
                  default:
                      // viizCom if modal is too big for window, correct its position and make it have internal scroll to show all content.
                      var maxHeight = window.innerHeight * 0.8;
                      mHLeft = this._calcLeft(this._modalWidth, this._teWidth, teLeft);
                      // center top, x with the control:
                      this._container.setAttribute(
                          'style',
                          'top: 50%; left: ' + mHLeft + 'px; transform: translateY(-50%);overflow:auto;max-height: ' + maxHeight + 'px;'
                      );
                      // pure center, even X:
                      // this._container.setAttribute("style", "top: 50%; left: 50%; transform: translateX(-50%) translateY(-50%);overflow:auto;max-height: " + maxHeight + "px;");
                      this._container.classList.add(MODAL_STATE_POSITIONED);
                  }
              };
              ContextualHost.prototype._tryPosModalLeft = function() {
                  var teLeft = this._targetElement.getBoundingClientRect().left;
                  if (teLeft < this._modalWidth) {
                      return false;
                  } else {
                      return 'left';
                  }
              };
              ContextualHost.prototype._tryPosModalRight = function() {
                  var teRight = this._targetElement.getBoundingClientRect().right;
                  var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                  if (w - teRight < this._modalWidth) {
                      return false;
                  } else {
                      return 'right';
                  }
              };
              ContextualHost.prototype._tryPosModalBottom = function() {
                  var teBottom = window.innerHeight - this._targetElement.getBoundingClientRect().bottom;
                  if (teBottom < this._modalHeight) {
                      return false;
                  } else {
                      return 'bottom';
                  }
              };
              ContextualHost.prototype._tryPosModalTop = function() {
                  var teTop = this._targetElement.getBoundingClientRect().top;
                  if (teTop < this._modalHeight) {
                      return false;
                  } else {
                      return 'top';
                  }
              };
              ContextualHost.prototype._copyModalToBody = function() {
                  // viizcom: bring the content back into the contextual host before opening
                  this._content.classList.remove('is-hidden');
                  this._contextualHostMain.appendChild(this._content);
                  document.body.appendChild(this._container);
              };
              ContextualHost.prototype._saveModalSize = function() {
                  var _modalStyles = window.getComputedStyle(this._container);
                  this._container.setAttribute('style', 'opacity: 0; z-index: -1');
                  this._container.classList.add(MODAL_STATE_POSITIONED);
                  this._container.classList.add(CONTEXT_STATE_CLASS);
                  if (this._matchTargetWidth) {
                      var teStyles = window.getComputedStyle(this._targetElement);
                      this._modalWidth = this._targetElement.getBoundingClientRect().width + (parseInt(teStyles.marginLeft, 10) + parseInt(teStyles.marginLeft, 10));
                  } else {
                      this._modalWidth = this._container.getBoundingClientRect().width + (parseInt(_modalStyles.marginLeft, 10) + parseInt(_modalStyles.marginRight, 10));
                      this._container.setAttribute('style', '');
                  }
                  this._modalHeight = this._container.getBoundingClientRect().height + (parseInt(_modalStyles.marginTop, 10) + parseInt(_modalStyles.marginBottom, 10));
                  this._container.classList.remove(MODAL_STATE_POSITIONED);
                  this._container.classList.remove(CONTEXT_STATE_CLASS);
                  this._teWidth = this._targetElement.getBoundingClientRect().width;
                  this._teHeight = this._targetElement.getBoundingClientRect().height;
              };
              ContextualHost.prototype._dismissAction = function(e) {
                  // If the element clicked is not INSIDE of contextualHost then close contextualHost
                  if (!this._container.contains(e.target) && e.target !== this._container) {
                      if (this._children !== undefined) {
                          var isChild_1 = false;
                          this._children.map(function(child) {
                              if (child !== undefined) {
                                  isChild_1 = child.contains(e.target);
                              }
                          });
                          if (!isChild_1) {
                              this.disposeModal();
                          }
                      } else {
                          this.disposeModal();
                      }
                  }
              };
              ContextualHost.prototype._setDismissClick = function() {
                  document.addEventListener('click', this._dismissAction, true);
                  document.addEventListener('keyup', this._handleKeyUpDismiss, true);
              };
              ContextualHost.prototype._handleKeyUpDismiss = function(e) {
                  if (e.keyCode === 32 || e.keyCode === 27) {
                      this._dismissAction(e);
                  }
              };
              ContextualHost.prototype._resizeAction = function() {
                  this.disposeModal();
              };
              ContextualHost.prototype._setResizeDisposal = function() {
                  window.addEventListener('resize', this._resizeAction, false);
              };
              return ContextualHost;
          })();
          fabric.ContextualHost = ContextualHost;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * Callout
     *
     * Add callouts to things and stuff
     *
     */
      var STATE_HIDDEN = 'is-hidden';
      var CLOSE_BUTTON_CLASS = '.vi-Callout-close';
      var CLOSE_ON_CLICK = '.vi-Callout-closeOnClick'; /* viizcom: allow setting this on elements you wish will close the callout when clicked*/
      var MODIFIER_OOBE_CLASS = 'vi-Callout--OOBE';
      var fabric;
      (function(fabric) {
          'use strict';
          var Callout = (function() {
              function Callout(container, addTarget, position) {
                  this._container = container;
                  this._addTarget = addTarget;
                  this._position = position;
                  this._closeButton = container.querySelector(CLOSE_BUTTON_CLASS);
                  this._closeOnClick = container.querySelectorAll(CLOSE_ON_CLICK);
                  this._setOpener();
              }
              Callout.prototype._setOpener = function() {
                  this._addTarget.addEventListener('click', this._clickHandler.bind(this), true);
              };
              Callout.prototype._openContextMenu = function() {
                  var modifiers = [];
                  if (this._hasModifier(MODIFIER_OOBE_CLASS)) {
                      modifiers.push('primaryArrow');
                  }
                  this._container.classList.remove(STATE_HIDDEN);
                  this._contextualHost = new fabric.ContextualHost(this._container, this._position, this._addTarget, true, modifiers, false);
                  if (this._closeButton) {
                      this._closeButton.addEventListener('click', this._closeHandler.bind(this), false);
                  }
                  if (this._closeOnClick && this._closeOnClick.length) {
                      for (var i = 0; i < this._closeOnClick.length; i++) this._closeOnClick[i].addEventListener('click', this._closeHandler.bind(this), false);
                  }
              };
              Callout.prototype._hasModifier = function(modifierClass) {
                  return this._container.classList.contains(modifierClass);
              };
              Callout.prototype._closeHandler = function(e) {
                  this._contextualHost.disposeModal();
                  this._closeButton && this._closeButton.removeEventListener('click', this._closeHandler.bind(this), false);
                  if (this._closeOnClick && this._closeOnClick.length) {
                      for (var i = 0; i < this._closeOnClick.length; i++) this._closeOnClick[i].removeEventListener('click', this._closeHandler.bind(this), false);
                  }
                  this._addTarget.removeEventListener('click', this._clickHandler.bind(this), true);
              };
              Callout.prototype._clickHandler = function(e) {
                  this._openContextMenu();
              };
              return Callout;
          })();
          fabric.Callout = Callout;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * CheckBox Plugin
       *
       * Adds basic demonstration functionality to .vi-CheckBox components.
       *
       */
          var CheckBox = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of CheckBox
         * @constructor
         */
              function CheckBox(container) {
                  this._container = container;
                  this._choiceField = this._container.querySelector('.vi-CheckBox-field');
                  this._choiceInput = this._container.querySelector('.vi-CheckBox-input');
                  if (this._choiceInput.checked) {
                      this._choiceField.setAttribute('aria-checked', 'true');
                  }
                  if (this._choiceField.getAttribute('aria-checked') === 'true') {
                      this._choiceField.classList.add('is-checked');
                  }
                  this._addListeners();
              }
              CheckBox.prototype.getValue = function() {
                  return this._choiceField.getAttribute('aria-checked') === 'true';
              };
              CheckBox.prototype.toggle = function() {
                  if (this.getValue()) {
                      this.unCheck();
                  } else {
                      this.check();
                  }
                  this._choiceInput.click();
              };
              CheckBox.prototype.check = function() {
                  this._choiceField.setAttribute('aria-checked', 'true');
                  this._choiceField.classList.add('is-checked');
              };
              CheckBox.prototype.unCheck = function() {
                  this._choiceField.setAttribute('aria-checked', 'false');
                  this._choiceField.classList.remove('is-checked');
              };
              CheckBox.prototype.removeListeners = function() {
                  this._choiceField.removeEventListener('focus', this._FocusHandler.bind(this));
                  this._choiceField.removeEventListener('blur', this._BlurHandler.bind(this));
                  this._choiceField.removeEventListener('click', this._ClickHandler.bind(this));
                  this._choiceField.removeEventListener('keydown', this._KeydownHandler.bind(this));
              };
              CheckBox.prototype._addListeners = function(events) {
                  var ignore = events && events.ignore;
                  if (!ignore || !(ignore.indexOf('focus') > -1)) {
                      this._choiceField.addEventListener('focus', this._FocusHandler.bind(this), false);
                  }
                  if (!ignore || !(ignore.indexOf('blur') > -1)) {
                      this._choiceField.addEventListener('blur', this._BlurHandler.bind(this), false);
                  }
                  if (!ignore || !(ignore.indexOf('click') > -1)) {
                      this._choiceField.addEventListener('click', this._ClickHandler.bind(this), false);
                  }
                  if (!ignore || !(ignore.indexOf('keydown') > -1)) {
                      this._choiceField.addEventListener('keydown', this._KeydownHandler.bind(this), false);
                  }
              };
              CheckBox.prototype._FocusHandler = function() {
                  this._choiceField.classList.add('in-focus');
              };
              CheckBox.prototype._BlurHandler = function() {
                  this._choiceField.classList.remove('in-focus');
              };
              CheckBox.prototype._ClickHandler = function(event) {
                  event.stopPropagation();
                  event.preventDefault();
                  if (!this._choiceField.classList.contains('is-disabled')) {
                      this.toggle();
                  }
              };
              CheckBox.prototype._KeydownHandler = function(event) {
                  if (event.keyCode === 32) {
                      event.stopPropagation();
                      event.preventDefault();
                      if (!this._choiceField.classList.contains('is-disabled')) {
                          this.toggle();
                      }
                  }
              };
              return CheckBox;
          })();
          fabric.CheckBox = CheckBox;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * RadioButton Plugin
       *
       * Adds basic demonstration functionality to .vi-RadioButton components.
       *
       */
          var RadioButton = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of RadioButton
         * @constructor
         */
              function RadioButton(container) {
                  this._container = container;
                  this._choiceField = this._container.querySelector('.vi-RadioButton-field');
                  this._choiceInput = this._container.querySelector('.vi-RadioButton-input');
                  if (this._choiceField.getAttribute('aria-checked') === 'true') {
                      this._choiceField.classList.add('is-checked');
                  }
                  this._addListeners();
              }
              RadioButton.prototype.getValue = function() {
                  return this._choiceField.getAttribute('aria-checked') === 'true';
              };
              RadioButton.prototype.toggle = function() {
                  if (this.getValue()) {
                      this.unCheck();
                  } else {
                      this.check();
                  }
              };
              RadioButton.prototype.check = function() {
                  this._choiceField.setAttribute('aria-checked', 'true');
                  this._choiceField.classList.add('is-checked');
                  this._choiceInput.checked = true;
              };
              RadioButton.prototype.unCheck = function() {
                  this._choiceField.setAttribute('aria-checked', 'false');
                  this._choiceField.classList.remove('is-checked');
                  this._choiceInput.checked = false;
              };
              RadioButton.prototype.removeListeners = function() {
                  this._choiceField.removeEventListener('focus', this._FocusHandler.bind(this));
                  this._choiceField.removeEventListener('blur', this._BlurHandler.bind(this));
                  this._choiceField.removeEventListener('click', this._RadioClickHandler.bind(this));
                  this._choiceField.addEventListener('keydown', this._RadioKeydownHandler.bind(this));
              };
              RadioButton.prototype._addListeners = function() {
                  this._choiceField.addEventListener('focus', this._FocusHandler.bind(this), false);
                  this._choiceField.addEventListener('blur', this._BlurHandler.bind(this), false);
                  this._choiceField.addEventListener('click', this._RadioClickHandler.bind(this), false);
                  this._choiceField.addEventListener('keydown', this._RadioKeydownHandler.bind(this), false);
              };
              RadioButton.prototype._RadioClickHandler = function(event) {
                  event.stopPropagation();
                  event.preventDefault();
                  if (!this._choiceField.classList.contains('is-disabled')) {
                      this._dispatchSelectEvent();
                  }
              };
              RadioButton.prototype._dispatchSelectEvent = function() {
                  var objDict = {
                      bubbles: true,
                      cancelable: true,
                      detail: {
                          name: this._choiceField.getAttribute('name'),
                          item: this
                      }
                  };
                  this._choiceField.dispatchEvent(new CustomEvent('msChoicefield', objDict));
              };
              RadioButton.prototype._RadioKeydownHandler = function(event) {
                  if (event.keyCode === 32) {
                      event.stopPropagation();
                      event.preventDefault();
                      if (!this._choiceField.classList.contains('is-disabled')) {
                          this._dispatchSelectEvent();
                      }
                  }
              };
              RadioButton.prototype._FocusHandler = function() {
                  this._choiceField.classList.add('in-focus');
              };
              RadioButton.prototype._BlurHandler = function() {
                  this._choiceField.classList.remove('in-focus');
              };
              return RadioButton;
          })();
          fabric.RadioButton = RadioButton;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * ChoiceFieldGroup Plugin
       *
       * Adds basic demonstration functionality to .vi-ChoiceFieldGroup components.
       *
       */
          var ChoiceFieldGroup = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of ChoiceFieldGroup
         * @constructor
         */
              function ChoiceFieldGroup(container) {
                  this._choiceFieldGroup = container;
                  this._choiceFieldComponents = [];
                  this._initalSetup();
                  this._addListeners();
              }
              ChoiceFieldGroup.prototype.removeListeners = function() {
                  this._choiceFieldGroup.removeEventListener('msChoicefield', this._ChoiceFieldHandler.bind(this));
              };
              ChoiceFieldGroup.prototype._initalSetup = function() {
                  var choiceFieldElements = this._choiceFieldGroup.querySelectorAll('.vi-RadioButton');
                  for (var i = 0; i < choiceFieldElements.length; i++) {
                      this._choiceFieldComponents[i] = new fabric.RadioButton(choiceFieldElements[i]);
                  }
              };
              ChoiceFieldGroup.prototype._addListeners = function() {
                  document.addEventListener('msChoicefield', this._ChoiceFieldHandler.bind(this), false);
              };
              ChoiceFieldGroup.prototype._ChoiceFieldHandler = function(event) {
                  var name = event.detail.name;
                  var selectedChoice = event.detail.item;
                  if (this._choiceFieldGroup.id === name) {
                      for (var i = 0; i < this._choiceFieldComponents.length; i++) {
                          this._choiceFieldComponents[i].unCheck();
                      }
                      selectedChoice.check();
                  }
              };
              return ChoiceFieldGroup;
          })();
          fabric.ChoiceFieldGroup = ChoiceFieldGroup;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * SearchBox component
     *
     * Allows you to search the world.
     *
     */
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
      /**
       *
       * @param {HTMLElement} container - the target container for an instance of SearchBox
       * @constructor
       *
       */
          var SB_FIELD = '.vi-SearchBox-field';
          var SB_CLEAR_BUTTON = '.vi-SearchBox-clear';
          var SB_EXIT_BUTTON = '.vi-SearchBox-exit';
          var SB_HAS_TEXT = 'has-text';
          var SB_IS_ACTIVE = 'is-active';
          var SB_IS_ANIMATED = 'is-animated';
          var SearchBox = (function() {
              function SearchBox(container) {
                  var rendered = container.className.indexOf('vi-rendered') >= 0;
                  if (rendered) return null;
                  else container.classList.add('vi-rendered');

                  var _this = this;
                  this._container = container;
                  this._saveDOMRefs(this._container);
                  this._boundExpandSearchHandler = this._expandSearchHandler.bind(this);
                  this._boundEnableClose = this._enableClose.bind(this);
                  this._boundCollapseSearchBox = this._collapseSearchBox.bind(this);
                  this._boundClearSearchBox = this._clearSearchBox.bind(this);
                  this._boundHandleBlur = this._handleBlur.bind(this);
                  this._boundExitSearchBox = this._exitSearchBox.bind(this);
                  this._setHasText();
                  this._setFocusAction(this._container);
                  this._setClearButtonAction();
                  this._setBlurAction();
                  this._clearOnly = false;
                  setTimeout(function() {
                      _this._checkState();
                      _this._addAnimation();
                  }, 10);
              }
              SearchBox.prototype.setCollapsedListeners = function() {
                  this._disposeListeners();
                  this._searchBox.addEventListener('click', this._boundExpandSearchHandler, false);
                  this._searchBoxField.addEventListener('focus', this._boundExpandSearchHandler, true);
              };
              SearchBox.prototype.getInputField = function() {
                  return this._searchBoxField;
              };
              SearchBox.prototype._saveDOMRefs = function(context) {
                  this._searchBox = context;
                  this._searchBoxField = this._searchBox.querySelector(SB_FIELD);
                  this._searchBoxClearButton = this._searchBox.querySelector(SB_CLEAR_BUTTON);
                  this._searchBoxExitButton = this._searchBox.querySelector(SB_EXIT_BUTTON);

                  // viizcom: issue 6007
                  var buttons = this._searchBox.querySelectorAll('button:not([type="button"])');
                  for (var i = 0; i < buttons.length; i++) buttons[i].type = 'button';
                  this._searchBoxField.addEventListener('keypress', function(event) {
                      if (event && event.keyCode == 13) {
                          event.returnValue = false;
                          event.cancelBubble = true;
                          event.preventDefault && event.preventDefault();
                          return false; // prevent submit in sharepoint wiki pages when hitting enter...
                      }
                  });
              };
              SearchBox.prototype._disposeListeners = function() {
                  this._searchBox.removeEventListener('click', this._boundExpandSearchHandler);
                  this._searchBoxField.removeEventListener('focus', this._boundExpandSearchHandler);
              };
              SearchBox.prototype._exitSearchBox = function(event) {
                  event.stopPropagation();
                  event.target.blur();
                  this._clearSearchBox();
                  this._collapseSearchBox();
                  this._searchBox.removeEventListener('keyup', this._boundEnableClose);
                  this.setCollapsedListeners();
              };
              SearchBox.prototype._collapseSearchBox = function() {
                  this._searchBox.classList.remove('is-active');
                  var event = document.createEvent('Event');
                  event.initEvent('searchCollapse', true, true);
                  this._searchBoxField.dispatchEvent(event);
              };
              SearchBox.prototype._expandSearchHandler = function() {
                  this._disposeListeners();
                  this._searchBox.classList.add('is-active');
                  this._searchBoxField.focus();
              };
              SearchBox.prototype._enableClose = function() {
                  this._setHasText();
              };
              SearchBox.prototype._setHasText = function() {
                  if (this._searchBoxField.value.length > 0) {
                      this._searchBox.classList.add(SB_HAS_TEXT);
                  } else {
                      this._searchBox.classList.remove(SB_HAS_TEXT);
                  }
              };
              SearchBox.prototype._setFocusAction = function(context) {
                  var _this = this;
                  this._searchBoxField.addEventListener(
                      'focus',
                      function() {
                          _this._setHasText();
                          _this._searchBox.addEventListener('keyup', _this._boundEnableClose, false);
                          _this._searchBox.classList.add(SB_IS_ACTIVE);
                          _this._searchBox.classList.add(SB_IS_ACTIVE);
                      },
                      true
                  );
              };
              SearchBox.prototype._clearSearchBox = function(event) {
                  var _this = this;
                  this._clearOnly = true;
                  this._searchBoxField.value = '';
                  fabric.Utilities.fireEvent(this._searchBoxField, 'change');
                  this._setHasText();
                  setTimeout(function() {
                      _this._clearOnly = false;
                  }, 10);
              };
              SearchBox.prototype._setClearButtonAction = function() {
                  var _this = this;
                  if (this._searchBoxExitButton) {
                      this._searchBoxExitButton.addEventListener('click', this._boundExitSearchBox, false);
                  }
                  if (this._searchBoxClearButton) {
                      this._searchBoxClearButton.addEventListener('mousedown', this._boundClearSearchBox, false);
                      this._searchBoxClearButton.addEventListener(
                          'keydown',
                          function(e) {
                              var keyCode = e.keyCode;
                              if (keyCode === 13) {
                                  _this._clearSearchBox(e);
                              }
                          },
                          false
                      );
                  }
              };
              SearchBox.prototype._handleBlur = function(event) {
                  var _this = this;
                  if (!this._clearOnly) {
                      this._searchBox.removeEventListener('keyup', this._boundEnableClose);
                      setTimeout(function() {
                          if (!_this._searchBox.contains(document.activeElement)) {
                              if (_this._searchBoxField.value == '') _this._clearSearchBox();
                              _this._collapseSearchBox();
                              _this.setCollapsedListeners();
                          }
                      }, 10);
                  } else {
                      this._searchBoxField.focus();
                  }
                  this._clearOnly = false;
              };
              SearchBox.prototype._setBlurAction = function() {
                  this._searchBoxField.addEventListener('blur', this._boundHandleBlur, true);
                  if (this._searchBoxClearButton) this._searchBoxClearButton.addEventListener('blur', this._boundHandleBlur, true);
              };
              SearchBox.prototype._checkState = function() {
                  // viizCom: if (this._searchBox.classList.contains("is-collapsed")) { - this caused clicking the watermark not to work.
                  this.setCollapsedListeners();
                  // }
              };
              SearchBox.prototype._addAnimation = function() {
                  this._container.classList.add(SB_IS_ANIMATED);
              };
              return SearchBox;
          })();
          fabric.SearchBox = SearchBox;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * CommandButton
     *
     * Buttons used primarily in the command bar
     *
     */
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
      /**
       *
       * @constructor
       */
          var CONTEXT_CLASS = '.vi-ContextualMenu';
          var CB_SPLIT_CLASS = '.vi-CommandButton-splitIcon';
          var CB_BUTTON_CLASS = '.vi-CommandButton-button';
          var MODAL_POSITION = 'bottom';
          var CommandButton = (function() {
              function CommandButton(container, contextMenu) {
                  this._container = container;
                  this._command = this._container;
                  this._commandButton = this._command.querySelector(CB_BUTTON_CLASS);
                  this._splitButton = this._command.querySelector(CB_SPLIT_CLASS);
                  if (contextMenu) {
                      this._contextualMenu = contextMenu;
                  } else {
                      this._contextualMenu = this._container.querySelector(CONTEXT_CLASS);
                  }
                  this._checkForMenu();
              }
              CommandButton.prototype._createModalHostView = function(e) {
                  // stop event bubbling, in some pages it would trigger a submit/refresh.
                  vifabric.Utilities.stopEvent(e);

                  this._modalHostView = new fabric.ContextualHost(this._contextualMenu, MODAL_POSITION, this._command, false);
              };
              CommandButton.prototype._setClick = function() {
                  if (this._splitButton) {
                      this._splitButton.addEventListener('click', this._createModalHostView.bind(this), false);
                  } else {
                      this._commandButton.addEventListener('click', this._createModalHostView.bind(this), false);
                  }
              };
              CommandButton.prototype._checkForMenu = function() {
                  if (this._contextualMenu) {
                      this._setClick();
                  }
              };
              return CommandButton;
          })();
          fabric.CommandButton = CommandButton;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * CommandBar
     *
     * Commanding and navigational surface
     *
     */
      var fabric;
      (function(fabric) {
          'use strict';
          var CONTEXTUAL_MENU = '.vi-ContextualMenu';
          var CONTEXTUAL_MENU_ITEM = '.vi-ContextualMenu-item';
          var CONTEXTUAL_MENU_LINK = '.vi-ContextualMenu-link';
          var CB_SEARCH_BOX = '.vi-SearchBox';
          var CB_MAIN_AREA = '.vi-CommandBar-mainArea';
          var CB_SIDE_COMMAND_AREA = '.vi-CommandBar-sideCommands';
          var CB_ITEM_OVERFLOW = '.vi-CommandBar-overflowButton';
          var CB_NO_LABEL_CLASS = 'vi-CommandButton--noLabel';
          var SEARCH_BOX_CLOSE = '.vi-SearchBox-closeField';
          var COMMAND_BUTTON = '.vi-CommandButton';
          var COMMAND_BUTTON_LABEL = '.vi-CommandButton-label';
          var ICON = '.vi-Icon';
          var OVERFLOW_WIDTH = 40;
          var OVERFLOW_LEFT_RIGHT_PADDING = 30;
          var CommandBar = (function() {
              function CommandBar(container) {
                  this.responsiveSizes = {
                      'sm-min': 320,
                      'md-min': 480,
                      'lg-min': 640,
                      'xl-min': 1024,
                      'xxl-min': 1366,
                      'xxxl-min': 1920
                  };
                  this.visibleCommands = [];
                  this.commandWidths = [];
                  this.overflowCommands = [];
                  this.itemCollection = [];
                  this._sideAreaCollection = [];
                  this.breakpoint = 'sm';
                  this._container = container;
                  this.responsiveSizes['sm-max'] = this.responsiveSizes['md-min'] - 1;
                  this.responsiveSizes['md-max'] = this.responsiveSizes['lg-min'] - 1;
                  this.responsiveSizes['lg-max'] = this.responsiveSizes['xl-min'] - 1;
                  this.responsiveSizes['xl-max'] = this.responsiveSizes['xxl-min'] - 1;
                  this.responsiveSizes['xxl-max'] = this.responsiveSizes['xxxl-min'] - 1;
                  this._setElements();
                  this._setBreakpoint();
                  // If the overflow exists then run the overflow resizing
                  if (this._elements.overflowCommand) {
                      this._initOverflow();
                  }
                  this._setUIState();
              }
              CommandBar.prototype._runsSearchBox = function(state) {
                  if (state === void 0) {
                      state = 'add';
                  }
                  this._changeSearchState('is-collapsed', state);
              };
              CommandBar.prototype._runOverflow = function() {
                  if (this._elements.overflowCommand) {
                      this._saveCommandWidths();
                      this._redrawMenu();
                      this._updateCommands();
                      this._drawCommands();
                      this._checkOverflow();
                  }
              };
              CommandBar.prototype._initOverflow = function() {
                  this._createContextualRef();
                  this._createItemCollection(this.itemCollection, CB_MAIN_AREA);
                  this._createItemCollection(this._sideAreaCollection, CB_SIDE_COMMAND_AREA);
                  this._saveCommandWidths();
                  this._updateCommands();
                  this._drawCommands();
                  this._setWindowEvent();
                  this._checkOverflow();
              };
              CommandBar.prototype._hasClass = function(element, cls) {
                  return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
              };
              CommandBar.prototype._onSearchExpand = function() {
                  if (this.breakpoint === 'lg') {
                      this._container.classList.add('search-expanded');
                      this._doResize();
                  }
              };
              CommandBar.prototype._onSearchCollapse = function() {
                  if (this.breakpoint === 'lg') {
                      this._container.classList.remove('search-expanded');
                      this._doResize();
                  }
              };
              CommandBar.prototype._getScreenSize = function() {
                  // First we need to set what the screen is doing, check screen size
                  var w = window;
                  var wSize = {
                      x: 0,
                      y: 0
                  };
                  var d = document;
            var e = d.documentElement;
            var g = d.getElementsByTagName('body')[0];
                  wSize.x = w.innerWidth || e.clientWidth || g.clientWidth;
                  wSize.y = w.innerHeight || e.clientHeight || g.clientHeight;
                  return wSize;
              };
              CommandBar.prototype._setBreakpoint = function() {
                  var screenSize = this._getScreenSize().x;
                  switch (true) {
                  case screenSize <= this.responsiveSizes['sm-max']:
                      this.breakpoint = 'sm';
                      break;
                  case screenSize >= this.responsiveSizes['md-min'] && screenSize <= this.responsiveSizes['md-max']:
                      this.breakpoint = 'md';
                      break;
                  case screenSize >= this.responsiveSizes['lg-min'] && screenSize <= this.responsiveSizes['lg-max']:
                      this.breakpoint = 'lg';
                      break;
                  case screenSize >= this.responsiveSizes['xl-min'] && screenSize <= this.responsiveSizes['xl-max']:
                      this.breakpoint = 'xl';
                      break;
                  case screenSize >= this.responsiveSizes['xxl-min'] && screenSize <= this.responsiveSizes['xxl-max']:
                      this.breakpoint = 'xxl';
                      break;
                  case screenSize >= this.responsiveSizes['xxxl-min']:
                      this.breakpoint = 'xxxl';
                      break;
                  }
              };
              CommandBar.prototype._createSearchInstance = function() {
                  if (this._elements.searchBox) {
                      return new fabric.SearchBox(this._elements.searchBox);
                  } else {
                      return false;
                  }
              };
              CommandBar.prototype._changeSearchState = function(state, action) {
                  if (this._elements.searchBox) {
                      switch (action) {
                      case 'remove':
                          this._elements.searchBox.classList.remove(state);
                          break;
                      case 'add':
                          this._elements.searchBox.classList.add(state);
                          break;
                      default:
                          break;
                      }
                  }
              };
              CommandBar.prototype._setElements = function() {
                  var _this = this;
                  this._elements = {
                      mainArea: this._container.querySelector(CB_MAIN_AREA)
                  };
                  if (this._container.querySelector(CB_SIDE_COMMAND_AREA)) {
                      this._elements.sideCommandArea = this._container.querySelector(CB_SIDE_COMMAND_AREA);
                  }
                  if (this._container.querySelector(CB_ITEM_OVERFLOW)) {
                      this._elements.overflowCommand = this._container.querySelector(CB_ITEM_OVERFLOW);
                      this._elements.contextMenu = this._container.querySelector(CB_ITEM_OVERFLOW).querySelector(CONTEXTUAL_MENU);
                  }
                  if (this._container.querySelector(CB_MAIN_AREA + ' ' + CB_SEARCH_BOX)) {
                      this._elements.searchBox = this._container.querySelector(CB_MAIN_AREA + ' ' + CB_SEARCH_BOX);
                      this._elements.searchBoxClose = this._container.querySelector(SEARCH_BOX_CLOSE);
                      this.searchBoxInstance = this._createSearchInstance();
                      this.searchBoxInstance.getInputField().addEventListener(
                          'focus',
                          function() {
                              _this._onSearchExpand();
                          },
                          false
                      );
                      this.searchBoxInstance.getInputField().addEventListener(
                          'searchCollapse',
                          function() {
                              _this._onSearchCollapse();
                          },
                          false
                      );
                  }
              };
              CommandBar.prototype._createItemCollection = function(iCollection, areaClass) {
          var item,
            label,
            iconClasses,
            splitClasses,
            items = this._container.querySelectorAll(areaClass + ' > ' + COMMAND_BUTTON + ':not(' + CB_ITEM_OVERFLOW + ')');
          // Initiate the overflow command
          this._commandButtonInstance = new fabric.CommandButton(this._elements.overflowCommand);
          for (var i = 0; i < items.length; i++) {
            item = items[i];
            label = item.querySelector(COMMAND_BUTTON_LABEL).textContent;
            var icon = item.querySelector(ICON);
            if (icon) {
              iconClasses = icon.className;
              splitClasses = iconClasses.split(' ');
              for (var o = 0; o < splitClasses.length; o++) {
                if (splitClasses[o].indexOf(ICON.replace('.', '') + '--') > -1) {
                  icon = splitClasses[o];
                  break;
                }
              }
            }
            iCollection.push({
              item: item,
              label: label,
              icon: icon,
              isCollapsed: item.classList.contains(CB_NO_LABEL_CLASS) ? true : false,
              commandButtonRef: new fabric.CommandButton(item)
            });
          }
          
        };
              CommandBar.prototype._createContextualRef = function() {
                  this.contextualItemContainerRef = this._elements.contextMenu.querySelector(CONTEXTUAL_MENU_ITEM).cloneNode(true);
                  this.contextualItemLink = this._elements.contextMenu.querySelector(CONTEXTUAL_MENU_LINK).cloneNode(false);
                  this.contextualItemIcon = this._elements.contextMenu.querySelector('.vi-Icon').cloneNode(false);
                  this._elements.contextMenu.innerHTML = '';
              };
              CommandBar.prototype._getElementWidth = function(element) {
                  var width, styles;
                  if (element.offsetParent === null) {
                      element.setAttribute('style', 'position: absolute; opacity: 0; display: block;');
                  }
                  width = element.getBoundingClientRect().width;
                  styles = window.getComputedStyle(element);
                  width += parseInt(styles.marginLeft, 10) + parseInt(styles.marginRight, 10);
                  element.setAttribute('style', '');
                  return width;
              };
              CommandBar.prototype._saveCommandWidths = function() {
                  for (var i = 0; i < this.itemCollection.length; i++) {
                      var item = this.itemCollection[i].item;
                      var width = this._getElementWidth(item);
                      this.commandWidths[i] = width;
                  }
              };
              CommandBar.prototype._updateCommands = function() {
                  var searchCommandWidth = 0;
                  var mainAreaWidth = this._elements.mainArea.getBoundingClientRect().width;
                  if (this._elements.searchBox) {
                      searchCommandWidth = this._getElementWidth(this._elements.searchBox);
                  }
                  var offset = searchCommandWidth + OVERFLOW_WIDTH + OVERFLOW_LEFT_RIGHT_PADDING;
                  var totalAreaWidth = mainAreaWidth - offset; // Start with searchbox width
                  // Reset overflow and visible
                  this.visibleCommands = [];
                  this.overflowCommands = [];
                  var totalWidths = 0;
                  for (var i = 0; i < this.itemCollection.length; i++) {
                      totalWidths += this.commandWidths[i];
                      if (totalWidths < totalAreaWidth) {
                          this.visibleCommands.push(this.itemCollection[i]);
                      } else {
                          this.overflowCommands.push(this.itemCollection[i]);
                      }
                  }
              };
              CommandBar.prototype._drawCommands = function() {
                  // Remove existing commands
                  this._elements.contextMenu.innerHTML = '';
                  for (var i = 0; i < this.overflowCommands.length; i++) {
                      this.overflowCommands[i].item.classList.add('is-hidden');
                      // Add all items to contextual menu.
                      var newCItem = this.contextualItemContainerRef.cloneNode(false);
                      var newClink = this.contextualItemLink.cloneNode(false);
                      var iconClass = this.overflowCommands[i].icon;
                      newClink.innerText = this.overflowCommands[i].label;
                      newCItem.appendChild(newClink);
                      if (iconClass) {
                          var newIcon = this.contextualItemIcon.cloneNode(false);
                          newIcon.className = ICON.replace('.', '') + ' ' + iconClass;
                          newCItem.appendChild(newIcon);
                      }
                      this._elements.contextMenu.appendChild(newCItem);
                  }
                  // Show visible commands
                  for (var x = 0; x < this.visibleCommands.length; x++) {
                      this.visibleCommands[x].item.classList.remove('is-hidden');
                  }
              };
              CommandBar.prototype._setWindowEvent = function() {
                  var _this = this;
                  window.addEventListener(
                      'resize',
                      function() {
                          _this._doResize();
                      },
                      false
                  );
              };
              CommandBar.prototype._processCollapsedClasses = function(type) {
                  for (var i = 0; i < this.itemCollection.length; i++) {
                      var thisItem = this.itemCollection[i];
                      if (!thisItem.isCollapsed) {
                          if (type === 'add') {
                              thisItem.item.classList.add(CB_NO_LABEL_CLASS);
                          } else {
                              thisItem.item.classList.remove(CB_NO_LABEL_CLASS);
                          }
                      }
                  }
                  for (var i = 0; i < this._sideAreaCollection.length; i++) {
                      var thisItem = this._sideAreaCollection[i];
                      if (!thisItem.isCollapsed) {
                          if (type === 'add') {
                              thisItem.item.classList.add(CB_NO_LABEL_CLASS);
                          } else {
                              thisItem.item.classList.remove(CB_NO_LABEL_CLASS);
                          }
                      }
                  }
              };
              CommandBar.prototype._setUIState = function() {
                  switch (this.breakpoint) {
                  case 'sm':
                      this._runsSearchBox();
                      this._processCollapsedClasses('add');
                      this._runOverflow();
                      break;
                  case 'md':
                      this._runsSearchBox();
                      // Add collapsed classes to commands
                      this._processCollapsedClasses('add');
                      this._runOverflow();
                      break;
                  case 'lg':
                      this._runsSearchBox();
                      this._processCollapsedClasses('remove');
                      this._runOverflow();
                      break;
                  case 'xl':
                      this._runsSearchBox('remove');
                      this._processCollapsedClasses('remove');
                      this._runOverflow();
                      break;
                  default:
                      this._runsSearchBox('remove');
                      this._processCollapsedClasses('remove');
                      this._runOverflow();
                      break;
                  }
              };
              CommandBar.prototype._checkOverflow = function() {
                  if (this.overflowCommands.length > 0) {
                      this._elements.overflowCommand.classList.remove('is-hidden');
                  } else {
                      this._elements.overflowCommand.classList.add('is-hidden');
                      if (this.activeCommand === this._elements.overflowCommand) {
                          this._elements.contextMenu.classList.remove('is-open');
                      }
                  }
              };
              CommandBar.prototype._redrawMenu = function() {
                  var left;
                  if (this._hasClass(this._elements.contextMenu, 'is-open')) {
                      left = this.activeCommand.getBoundingClientRect().left;
                      this._drawOverflowMenu(left);
                  }
              };
              CommandBar.prototype._drawOverflowMenu = function(left) {
                  this._elements.contextMenu.setAttribute('style', 'left: ' + left + 'px; transform: translateX(-50%)');
              };
              CommandBar.prototype._doResize = function() {
                  this._setBreakpoint();
                  this._setUIState();
              };
              return CommandBar;
          })();
          fabric.CommandBar = CommandBar;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
          var MODAL_POSITION = 'bottom';
          var SUBMENU_POSITION = 'right';
          var ContextualMenu = (function() {
              function ContextualMenu(container, hostTarget, position) {
                  var rendered = container.className.indexOf('vi-rendered') >= 0;
                  if (rendered) return null;
                  else container.classList.add('vi-rendered');

                  this._container = container;
                  this._hostTarget = hostTarget;
                  this._position = position || MODAL_POSITION;
                  this._isOpen = false;
                  this._setOpener(hostTarget);
                  this._init();
              }
              ContextualMenu.prototype.getHost = function() {
                  return this._host;
              };
              ContextualMenu.prototype._init = function() {
                  this._container.addEventListener('click', this._onContextualMenuClick.bind(this), true);
                  document.addEventListener('click', this._onDocumentClick.bind(this), false);
              };
              ContextualMenu.prototype._onDocumentClick = function(event) {
                  var target = event.target;
                  var classList = target.classList;
                  if (!this._hostTarget.contains(target) && (typeof classList !== 'undefined' && !classList.contains('vi-ContextualMenu-link'))) {
                      this._isOpen = false;
                  }
              };
              ContextualMenu.prototype._onContextualMenuClick = function(event) {
                  var target = event.target;
                  var classList = target.classList;
                  if (classList.contains('vi-ContextualMenu-link') && !classList.contains('is-disabled')) {
                      if (this._container.classList.contains('vi-ContextualMenu--multiselect')) {
                          this._multiSelect(target);
                      } else {
                          this._singleSelect(target);
                          if (!target.parentElement.classList.contains('vi-ContextualMenu-item--hasMenu')) {
                              this._host.disposeModal();
                              this._isOpen = false;
                          }
                      }
                  }
              };
              ContextualMenu.prototype._multiSelect = function(target) {
                  if (target.classList.contains('no-select')) return; // viizcom: the caller will manage selected status manually
                  if (target.classList.contains('is-selected')) {
                      target.classList.remove('is-selected');
                  } else {
                      target.classList.add('is-selected');
                  }
              };
              ContextualMenu.prototype._singleSelect = function(target) {
                  if (target.classList.contains('no-select')) return; // viizcom: the caller will manage selected status manually
                  var selecteds = this._container.querySelectorAll('.is-selected');
                  var i = selecteds.length;
                  while (i--) {
                      selecteds[i].classList.remove('is-selected');
                  }
                  target.classList.add('is-selected');
              };
              ContextualMenu.prototype._toggleMenu = function(event) {
                  !this._isOpen ? this._openContextMenu(event) : this._host.disposeModal();
                  this._isOpen = !this._isOpen;
              };
              ContextualMenu.prototype._setOpener = function(hostTarget) {
                  var _this = this;
                  hostTarget.addEventListener('click', function(event) {
                      event.preventDefault();
                      _this._toggleMenu(event);
                  });
              };
              ContextualMenu.prototype._openContextMenu = function(event) {
                  this._createModalHostView(this._container, this._position, this._hostTarget);
                  this._checkForSubmenus(this._container);
              };
              ContextualMenu.prototype._checkForSubmenus = function(container) {
                  var _this = this;
                  var submenus = container.querySelectorAll('.vi-ContextualMenu-item.vi-ContextualMenu-item--hasMenu');
                  var i = submenus.length;
                  if (submenus.length) {
                      var _loop_1 = function() {
                          var sub = submenus[i];
                          // viizcom: since we don't move the sub menu from this html location we have to prevent it from initializing several times
                          if (!sub.classList.contains('is-initialized')) {
                              sub.classList.add('is-initialized');
                              var button = submenus[i].querySelector('.vi-ContextualMenu-link');
                              var menu = submenus[i].querySelector('.vi-ContextualMenu');
                              if (menu) {
                                  var contextualMenu_1 = new fabric.ContextualMenu(menu, button, SUBMENU_POSITION);
                                  menu.addEventListener('hostAdded', function() {
                                      _this._host.setChildren(contextualMenu_1.getHost());
                                  });
                              }
                          }
                      };
                      while (i--) {
                          _loop_1();
                      }
                  }
              };
              ContextualMenu.prototype._createModalHostView = function(container, position, hostTarget) {
                  container.classList.remove('is-hidden');
                  this._host = new fabric.ContextualHost(container, position, hostTarget, false);
                  var event = document.createEvent('Event');
                  event.initEvent('hostAdded', true, true);
                  container.dispatchEvent(event);
              };
              return ContextualMenu;
          })();
          fabric.ContextualMenu = ContextualMenu;
      })(fabric || (fabric = {}));

      ('use strict');

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // @TODO - we can add this once jquery is removed
      // "use strict";
      var fabric;
      (function(fabric) {
      /**
       * DatePicker Plugin
       */
          var DatePicker = (function() {
              function DatePicker(container, options) {
                  var _this = this;
                  /** Set up letiables and run the Pickadate plugin. */
                  var $datePicker = $(container);
                  var $dateField = $datePicker.find('.vi-TextField-field').pickadate(
                      $.extend(
                          {
                              // Strings and translations.
                              weekdaysShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
                              // Don't render the buttons
                              clear: '',
                              close: '',
                              today: '',
                              // Events
                              onStart: function() {
                                  _this.initCustomView($datePicker);
                              },
                              // Classes
                              klass: {
                                  // The element states
                                  input: 'vi-DatePicker-input',
                                  active: 'vi-DatePicker-input--active',
                                  // The root picker and states
                                  picker: 'vi-DatePicker-picker',
                                  opened: 'vi-DatePicker-picker--opened',
                                  focused: 'vi-DatePicker-picker--focused',
                                  // The picker holder
                                  holder: 'vi-DatePicker-holder',
                                  // The picker frame, wrapper, and box
                                  frame: 'vi-DatePicker-frame',
                                  wrap: 'vi-DatePicker-wrap',
                                  box: 'vi-DatePicker-dayPicker',
                                  // The picker header
                                  header: 'vi-DatePicker-header',
                                  // Month & year labels
                                  month: 'vi-DatePicker-month',
                                  year: 'vi-DatePicker-year',
                                  // Table of dates
                                  table: 'vi-DatePicker-table',
                                  // Weekday labels
                                  weekdays: 'vi-DatePicker-weekday',
                                  // Day states
                                  day: 'vi-DatePicker-day',
                                  disabled: 'vi-DatePicker-day--disabled',
                                  selected: 'vi-DatePicker-day--selected',
                                  highlighted: 'vi-DatePicker-day--highlighted',
                                  now: 'vi-DatePicker-day--today',
                                  infocus: 'vi-DatePicker-day--infocus',
                                  outfocus: 'vi-DatePicker-day--outfocus'
                              }
                          },
                          options || {}
                      )
                  );
                  var $picker = $dateField.pickadate('picker');
                  this.picker = $picker;
                  /** Respond to built-in picker events. */
                  $picker.on({
                      render: function() {
                          _this.updateCustomView($datePicker);
                      }
                  });
              }
              /**
         * After the Pickadate plugin starts, this function
         * adds additional controls to the picker view.
         */
              DatePicker.prototype.initCustomView = function($datePicker) {
                  var _this = this;
                  /** Get some letiables ready. */
                  var $monthControls = $datePicker.find('.vi-DatePicker-monthComponents');
                  var $goToday = $datePicker.find('.vi-DatePicker-goToday');
                  var $monthPicker = $datePicker.find('.vi-DatePicker-monthPicker');
                  var $yearPicker = $datePicker.find('.vi-DatePicker-yearPicker');
                  var $pickerWrapper = $datePicker.find('.vi-DatePicker-wrap');
                  var $picker = $datePicker.find('.vi-TextField-field').pickadate('picker');
                  /** Move the month picker into position. */
                  $monthControls.appendTo($pickerWrapper);
                  $goToday.appendTo($pickerWrapper);
                  $monthPicker.appendTo($pickerWrapper);
                  $yearPicker.appendTo($pickerWrapper);
                  /** Update the custom view. */
                  this.updateCustomView($datePicker);
                  /** dispatch click on document so anything listening can be notified */
                  $picker.on('open', function(e) {
                      var evt = document.createEvent('MouseEvents');
                      evt.initEvent('click', true, true);
                      document.dispatchEvent(evt);
                  });
                  /** Move back one month. */
                  $monthControls.on('click', '.js-prevMonth', function(event) {
                      event.preventDefault();
                      var newMonth = $picker.get('highlight').month - 1;
                      _this.changeHighlightedDate([null, newMonth, null]);
                  });
                  /** Move ahead one month. */
                  $monthControls.on('click', '.js-nextMonth', function(event) {
                      event.preventDefault();
                      var newMonth = $picker.get('highlight').month + 1;
                      _this.changeHighlightedDate([null, newMonth, null]);
                  });
                  /** Move back one year. */
                  $monthPicker.on('click', '.js-prevYear', function(event) {
                      event.preventDefault();
                      var newYear = $picker.get('highlight').year - 1;
                      _this.changeHighlightedDate([newYear, null, null]);
                  });
                  /** Move ahead one year. */
                  $monthPicker.on('click', '.js-nextYear', function(event) {
                      event.preventDefault();
                      var newYear = $picker.get('highlight').year + 1;
                      _this.changeHighlightedDate([newYear, null, null]);
                  });
                  /** Move back one decade. */
                  $yearPicker.on('click', '.js-prevDecade', function(event) {
                      event.preventDefault();
                      var newYear = $picker.get('highlight').year - 10;
                      _this.changeHighlightedDate([newYear, null, null]);
                  });
                  /** Move ahead one decade. */
                  $yearPicker.on('click', '.js-nextDecade', function(event) {
                      event.preventDefault();
                      var newYear = $picker.get('highlight').year + 10;
                      _this.changeHighlightedDate([newYear, null, null]);
                  });
                  /** Go to the current date, shown in the day picking view. */
                  $goToday.click(function(event) {
                      event.preventDefault();
                      /** Select the current date, while keeping the picker open. */
                      var now = new Date();
                      $picker.set('select', [now.getFullYear(), now.getMonth(), now.getDate()]);
                      /** Switch to the default (calendar) view. */
                      $datePicker.removeClass('is-pickingMonths').removeClass('is-pickingYears');
                  });
                  /** Change the highlighted month. */
                  $monthPicker.on('click', '.js-changeDate', function(event) {
                      event.preventDefault();
                      var $changeDate = $(event.target);
                      /** Get the requested date from the data attributes. */
                      var newYear = $changeDate.attr('data-year');
                      var newMonth = $changeDate.attr('data-month');
                      var newDay = $changeDate.attr('data-day');
                      /** Update the date. */
                      _this.changeHighlightedDate([newYear, newMonth, newDay]);
                      /** If we"ve been in the "picking months" state on mobile, remove that state so we show the calendar again. */
                      if ($datePicker.hasClass('is-pickingMonths')) {
                          $datePicker.removeClass('is-pickingMonths');
                      }
                  });
                  /** Change the highlighted year. */
                  $yearPicker.on('click', '.js-changeDate', function(event) {
                      event.preventDefault();
                      var $changeDate = $(event.target);
                      /** Get the requested date from the data attributes. */
                      var newYear = $changeDate.attr('data-year');
                      var newMonth = $changeDate.attr('data-month');
                      var newDay = $changeDate.attr('data-day');
                      /** Update the date. */
                      _this.changeHighlightedDate([newYear, newMonth, newDay]);
                      /** If we"ve been in the "picking years" state on mobile, remove that state so we show the calendar again. */
                      if ($datePicker.hasClass('is-pickingYears')) {
                          $datePicker.removeClass('is-pickingYears');
                      }
                  });
                  /** Switch to the default state. */
                  $monthPicker.on('click', '.js-showDayPicker', function() {
                      $datePicker.removeClass('is-pickingMonths');
                      $datePicker.removeClass('is-pickingYears');
                  });
                  /** Switch to the is-pickingMonths state. */
                  $monthControls.on('click', '.js-showMonthPicker', function() {
                      $datePicker.toggleClass('is-pickingMonths');
                  });
                  /** Switch to the is-pickingYears state. */
                  $monthPicker.on('click', '.js-showYearPicker', function() {
                      $datePicker.toggleClass('is-pickingYears');
                  });
              };
              /** Change the highlighted date. */
              DatePicker.prototype.changeHighlightedDate = function(dateArr) {
                  var newDateArr = this.setDateAttributes(dateArr);
                  /** Update it. */
                  this.picker.set('highlight', newDateArr);
              };
              /** Whenever the picker renders, do our own rendering on the custom controls. */
              DatePicker.prototype.updateCustomView = function($datePicker) {
                  /** Get some letiables ready. */
                  var $monthPicker = $datePicker.find('.vi-DatePicker-monthPicker');
                  var $yearPicker = $datePicker.find('.vi-DatePicker-yearPicker');
                  var $picker = $datePicker.find('.vi-TextField-field').pickadate('picker');
                  /** Set the correct year. */
                  $monthPicker.find('.vi-DatePicker-currentYear').text($picker.get('view').year);
                  /** Highlight the current month. */
                  $monthPicker.find('.vi-DatePicker-monthOption').removeClass('is-highlighted');
                  $monthPicker.find(".vi-DatePicker-monthOption[data-month='" + $picker.get('highlight').month + "']").addClass('is-highlighted');
                  /** Generate the grid of years for the year picker view. */
                  // Start by removing any existing generated output. */
                  $yearPicker.find('.vi-DatePicker-currentDecade').remove();
                  $yearPicker.find('.vi-DatePicker-optionGrid').remove();
                  // Generate the output by going through the years.
                  var startingYear = $picker.get('highlight').year - 11;
                  var decadeText = startingYear + ' - ' + (startingYear + 11);
                  var output = "<div class='vi-DatePicker-currentDecade'>" + decadeText + '</div>';
                  output += "<div class='vi-DatePicker-optionGrid'>";
                  for (var year = startingYear; year < startingYear + 12; year++) {
                      output += "<span class='vi-DatePicker-yearOption js-changeDate' data-year='" + year + "'>" + year + '</span>';
                  }
                  output += '</div>';
                  // Output the title and grid of years generated above.
                  $yearPicker.append(output);
                  /** Highlight the current year. */
                  $yearPicker.find('.vi-DatePicker-yearOption').removeClass('is-highlighted');
                  $yearPicker.find(".vi-DatePicker-yearOption[data-year='" + $picker.get('highlight').year + "']").addClass('is-highlighted');
              };
              DatePicker.prototype.setDateAttributes = function(dateArr) {
                  var newYear = dateArr[0];
            var newMonth = dateArr[1];
            var newDay = dateArr[2];
                  /** All letiables are optional. If not provided, default to the current value. */
                  if (typeof newYear === 'undefined' || newYear === null) {
                      newYear = this.picker.get('highlight').year;
                  }
                  if (typeof newMonth === 'undefined' || newMonth === null) {
                      newMonth = this.picker.get('highlight').month;
                  }
                  if (typeof newDay === 'undefined' || newDay === null) {
                      newDay = this.picker.get('highlight').date;
                  }
                  return [newYear, newMonth, newDay];
              };
              return DatePicker;
          })();
          fabric.DatePicker = DatePicker;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
          var Overlay = (function() {
              function Overlay(overlayElement) {
                  if (overlayElement) {
                      this.overlayElement = overlayElement;
                  } else {
                      var overlayContainer = document.createElement('div');
                      overlayContainer.setAttribute('class', 'vi-Overlay');
                      this.overlayElement = overlayContainer;
                  }
                  this.overlayElement.addEventListener('click', this.hide.bind(this), false);
              }
              Overlay.prototype.remove = function() {
                  if (this.overlayElement && this.overlayElement.parentElement) {
                      this.overlayElement.parentElement.removeChild(this.overlayElement);
                  }
              };
              Overlay.prototype.show = function() {
                  this.overlayElement.classList.add('is-visible');
                  document.body.classList.add('vi-u-overflowHidden');
              };
              Overlay.prototype.hide = function() {
                  this.overlayElement.classList.remove('is-visible');
                  document.body.classList.remove('vi-u-overflowHidden');
              };
              return Overlay;
          })();
          fabric.Overlay = Overlay;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // @TODO - we can add this once jquery is removed
      var fabric;
      (function(fabric) {
          var Dialog = (function() {
              function Dialog(dialog) {
                  this._dialog = dialog;

                  // viizcom change
                  this._originalParent = dialog.parentElement;
                  this._moveToBody = dialog.classList.contains('vi-Dialog-moveToBody');

                  this._closeButtonElement = this._dialog.querySelector('.vi-Dialog-buttonClose');
                  this._actionButtonElements = this._dialog.querySelectorAll('.vi-Dialog-action');

                  // viizcom changes
                  // removeEventListener only works with named methods
                  // added overlay click handler for modal dialogs to work
                  // moved all event listener binding/ubinding to _addEventListeners/_removeEventListeners
                  // ensureOverlay makes sure that there is only one overlay ever created for this dialog
                  this._overlayClickHandler = this._overlayClick.bind(this);
                  this._closeEventListener = this.close.bind(this);
                  this._ensureOverlay();
                  this._addEventListeners();
              }
              Dialog.prototype._addEventListeners = function() {
                  if (this._closeButtonElement) {
                      this._closeButtonElement.addEventListener('click', this._closeEventListener, false);
                  }
                  for (var i = 0; i < this._actionButtonElements.length; i++) {
                      this._actionButtonElements[i].addEventListener('click', this._closeEventListener, false);
                  }

                  if (this._dialog && !this._dialog.classList.contains('vi-Dialog--blocking')) {
                      this._overlay.overlayElement.addEventListener('click', this._overlayClickHandler);
                  }
              };
              Dialog.prototype._removeEventListeners = function() {
                  if (this._closeButtonElement) {
                      this._closeButtonElement.removeEventListener('click', this._closeEventListener, false);
                  }
                  for (var i = 0; i < this._actionButtonElements.length; i++) {
                      if (this.this._actionButtonElements[i]) {
                          this._actionButtonElements[i].removeEventListener('click', this._closeEventListener, false);
                      }
                  }
                  if (this._overlay && this._overlay.overlayElement) {
                      this._overlay.overlayElement.removeEventListener('click', this._overlayClickHandler);
                  }
              };

              // viizcom changes
              // moved the call to this._overlay.remove() to the remove method. now the overlay is resued instead of being
              // removed and appened  everytime open/close is called.
              Dialog.prototype.close = function() {
                  if (typeof this.dialogClosedHandler === 'function') this.dialogClosedHandler(); // viizcom: added close handler
                  this._overlay.hide();
                  this._dialog.classList.remove('is-open');
                  document.body.classList.remove('vi-u-overflowHidden');

                  // viizcom: restore to original location
                  if (this._moveToBody) {
                      this._originalParent.appendChild(this._dialog);
                      this._originalParent.appendChild(this._overlay.overlayElement);
                  }
              };
              Dialog.prototype.open = function() {
                  if (!this._dialog.classList.contains('vi-Dialog--blocking')) {
                      document.body.classList.add('vi-u-overflowHidden');
                  }

                  // viizcom: make sure it is on full page size
                  if (this._moveToBody) {
                      document.body.appendChild(this._dialog);
                      document.body.appendChild(this._overlay.overlayElement);
                  }

                  this._dialog.classList.add('is-open');
                  this._overlay.show();
              };
              // viizcom changes for modal dialogs
              Dialog.prototype._overlayClick = function() {
                  if (!this._dialog.classList.contains('vi-Dialog--modal')) {
                      this.close();
                  } else if (this._dialog.classList.contains('is-open')) {
                      this._overlay.show();
                  }
              };
              Dialog.prototype._ensureOverlay = function() {
                  if (!this._overlay) {
                      this._overlay = new fabric.Overlay();
                      this._dialog.parentElement.appendChild(this._overlay.overlayElement);
                  }
              };
              // viizcom changes
              // added remove method so that we can "destroy" the dialog
              Dialog.prototype.remove = function() {
                  this._removeEventListeners();

                  if (this._overlay) {
                      this._overlay.remove();
                  }
                  if (this._dialog && this._dialog.parentElement) {
                      this._dialog.parentElement.removeChild(this._dialog);
                  }
              };
              return Dialog;
          })();
          fabric.Dialog = Dialog;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // "use strict";
      var fabric;
      (function(fabric) {
      /**
       * DialogHost class
       */
          var DialogHost = (function() {
              function DialogHost() {}
              return DialogHost;
          })();
          fabric.DialogHost = DialogHost;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
      /**
       * Panel Host
       *
       * A host for the panel control
       *
       */
          var PANEL_HOST_CLASS = 'vi-PanelHost';
          var PanelHost = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Panel
         * @constructor
         */
              function PanelHost(layer, callBack) {
                  this._layer = layer;
                  this._callBack = callBack;
                  this._createElements();
                  this._renderElements();
              }
              PanelHost.prototype.dismiss = function() {
                  this.overlay.hide();
                  document.body.removeChild(this.panelHost);
              };
              PanelHost.prototype.update = function(layer, callBack) {
                  this.panelHost.replaceChild(layer, this._layer);
                  if (callBack) {
                      callBack();
                  }
              };
              PanelHost.prototype._renderElements = function() {
                  document.body.appendChild(this.panelHost);
                  if (this._callBack) {
                      this._callBack(this._layer);
                  }
              };
              PanelHost.prototype._createElements = function() {
                  this.panelHost = document.createElement('div');
                  this.panelHost.classList.add(PANEL_HOST_CLASS);
                  this.panelHost.appendChild(this._layer);
                  this.overlay = new fabric.Overlay(this._overlayContainer);
                  this.overlay.show();
                  // Append Elements
                  this.panelHost.appendChild(this.overlay.overlayElement);
              };
              return PanelHost;
          })();
          fabric.PanelHost = PanelHost;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
      /**
       * Panel Host
       *
       * A host for the panel control
       *
       */
          var ANIMATE_IN_STATE = 'animate-in';
          var ANIMATE_OUT_STATE = 'animate-out';
          var ANIMATION_END = 400;
          var Panel = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Panel
         * @constructor
         */
              function Panel(panel, direction, animateOverlay) {
                  this._panel = panel;
                  this._direction = direction || 'right';
                  this._animateOverlay = animateOverlay || true;
                  this.panelHost = new fabric.PanelHost(this._panel, this._animateInPanel);
                  this._closeButton = this._panel.querySelector('.vi-PanelAction-close');
                  this._clickHandler = this.dismiss.bind(this, null);
                  this._setEvents();
                  // Set body height to 100% and overflow hidden while panel is open
                  document.body.setAttribute('style', 'height: 100%; overflow: hidden;');

                  // viizCom fix panel inner content scroll
                  var elms = this._panel.getElementsByClassName('vi-Panel-contentInner');

                  if (elms.length) {
                      try {
                          var elm = this._panel.getElementsByClassName('vi-Panel-contentInner')[0];
                          elm.style.height = '100%';
                          var c = getComputedStyle(elm);
                          var height =
                elm.parentNode.clientHeight -
                parseInt(c.marginTop, 10) -
                parseInt(c.marginBottom, 10) -
                parseInt(c.paddingTop, 10) -
                parseInt(c.paddingBottom, 10);
                          elm.style.height = height + 'px';
                      } catch (ex) {}
                  }
                  // viizcom end
              }
              Panel.prototype.dismiss = function(callBack) {
                  var _this = this;
                  this._panel.classList.add(ANIMATE_OUT_STATE);
                  setTimeout(function() {
                      _this._panel.classList.remove(ANIMATE_OUT_STATE);
                      _this._panel.classList.remove('is-open');
                      _this.panelHost.dismiss();
                      if (callBack) {
                          callBack();
                      }
                      // Remove temporary body styles
                      document.body.setAttribute('style', '');
                  }, ANIMATION_END);
                  if (this._closeButton !== null) {
                      this._closeButton.removeEventListener('click', this._clickHandler);
                  }
              };
              Panel.prototype._setEvents = function() {
                  this.panelHost.overlay.overlayElement.addEventListener('click', this._clickHandler);
                  if (this._closeButton !== null) {
                      this._closeButton.addEventListener('click', this._clickHandler);
                  }
              };
              Panel.prototype._animateInPanel = function(layer) {
                  layer.classList.add(ANIMATE_IN_STATE);
                  layer.classList.add('is-open');
                  setTimeout(function() {
                      layer.classList.remove(ANIMATE_IN_STATE);
                  }, ANIMATION_END);
              };
              return Panel;
          })();
          fabric.Panel = Panel;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
          var DROPDOWN_CLASS = 'vi-Dropdown';
          var DROPDOWN_TITLE_CLASS = 'vi-Dropdown-title';
          var DROPDOWN_LABEL_HELPER = 'vi-Dropdown-truncator';
          var DROPDOWN_ITEMS_CLASS = 'vi-Dropdown-items';
          var DROPDOWN_ITEM_CLASS = 'vi-Dropdown-item';
          var DROPDOWN_SELECT_CLASS_SELECTOR = '.vi-Dropdown-select';
          var PANEL_CLASS = 'vi-Panel';
          var IS_OPEN_CLASS = 'is-open';
          var IS_DISABLED_CLASS = 'is-disabled';
          var IS_SELECTED_CLASS = 'is-selected';
          var ANIMATE_IN_CLASS = 'animate-in';
          var SMALL_MAX_WIDTH = 332;

          /*viizcom */
          var currentDropdowns = []; // keep existing first instances so if its called again - we don't re-create a new fabric control
          var DROPDOWN_ITEM_SEARCH_TERMS_ATTRIBUE_NAME = 'vi-search-terms';
          /* viizcom end*/
          /**
       * Dropdown Plugin
       *
       * Given .vi-Dropdown containers with generic <select> elements inside, this plugin hides the original
       * dropdown and creates a new "fake" dropdown that can more easily be styled across browsers.
       *
       */
          var Dropdown = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Dropdown
         * @constructor
         */
              function Dropdown(container) {
                  var reRender = false; // rerender - once called again, this will update the options list in the dropdown to reflect added/removed options
                  var firstInstance = null;
                  if (typeof container === 'undefined' || container === null) return null;
                  reRender = container.className.indexOf('vi-rendered') >= 0;
                  if (!reRender) {
                      container.className += ' vi-rendered';
                      container.setAttribute('vifabricddid', currentDropdowns.length);
                      currentDropdowns.push(this);
                  } else {
                      firstInstance = currentDropdowns[parseInt(container.getAttribute('vifabricddid'), 10)];
                  }

                  this._container = container;
                  if (reRender) {
                      this._dropdownLabelHelper = firstInstance._dropdownLabelHelper;
                      this._newDropdownLabel = firstInstance._newDropdownLabel;
                      this._newDropdown = firstInstance._newDropdown;
                      // remove old options
                      while (this._newDropdown.firstChild) {
                          this._newDropdown.removeChild(this._newDropdown.firstChild);
                      }
                      firstInstance._dropdownItems.length = 0;
                      this._dropdownItems = firstInstance._dropdownItems;
                      this._originalDropdown = firstInstance._originalDropdown;
                      // viizCom add support for multi-select
                      this._multiple = this._originalDropdown && this._originalDropdown.multiple === true;
                  } else {
                      this._dropdownLabelHelper = document.createElement('span');
                      this._dropdownLabelHelper.classList.add(DROPDOWN_LABEL_HELPER);
                      this._dropdownLabelHelper.classList.add(DROPDOWN_TITLE_CLASS);
                      this._newDropdownLabel = document.createElement('span');
                      this._newDropdownLabel.classList.add(DROPDOWN_TITLE_CLASS);
                      this._newDropdown = document.createElement('ul');
                      this._newDropdown.classList.add(DROPDOWN_ITEMS_CLASS);
                      this._dropdownItems = [];
                      this._originalDropdown = container.querySelector(DROPDOWN_SELECT_CLASS_SELECTOR);
                      // viizCom add support for multi-select
                      this._multiple = this._originalDropdown && this._originalDropdown.multiple === true;
                      if (this._multiple) this._newDropdown.classList.add('vi-DropDown--multiselect');
                  }

                  // viizCom add icons to vi-Dropdown-select--icon with no options...
                  if (this._originalDropdown.className.indexOf('vi-Dropdown-select--icon') >= 0 && this._originalDropdown.querySelectorAll('option').length < 1) {
                      var selectedValue = this._originalDropdown.getAttribute('selectedValue');

                      if (this._originalDropdown.className.indexOf('vi-Dropdown-select--allowClear') >= 0) {
                          var option = document.createElement('option');
                          option.text = '<i class="vi-Icon vi-Icon--Clear"></i>None';
                          option.value = ' ';
                          this._originalDropdown.add(option, 0);
                      }

                      for (var i = 0; i < fabric.allIcons.length; i++) {
                          var option = document.createElement('option');
                          option.text = '<i class="vi-Icon vi-Icon--' + fabric.allIcons[i] + '"></i>' + fabric.allIcons[i];
                          option.value = fabric.allIcons[i];
                          if (option.value === selectedValue) option.selected = true;
                          this._originalDropdown.add(option);
                      }
                  }

                  // viizCom bind handler for search: key down
                  this._onKeyDown = this._onKeyDown.bind(this);
                  // viizCom end

                  var _originalOptions = this._originalDropdown.querySelectorAll('option');
                  /** Bind the callbacks to retain their context */
                  this._onCloseDropdown = this._onCloseDropdown.bind(this);
                  this._onItemSelection = this._onItemSelection.bind(this);
                  this._onOpenDropdown = this._onOpenDropdown.bind(this);
                  /** Create a new option as a list item, and add it to the replacement dropdown */
                  this._newDropdownLabel.innerHTML = '';
                  for (var i = 0; i < _originalOptions.length; ++i) {
                      var option = _originalOptions[i];
                      if (option.selected) {
                          if (this._multiple) {
                              if (this._newDropdownLabel.innerHTML != '') this._newDropdownLabel.innerHTML += ', ';
                              this._newDropdownLabel.innerHTML += option.text;
                          } else this._newDropdownLabel.innerHTML = option.text;
                      }
                      var newItem = document.createElement('li');
                      newItem.classList.add(DROPDOWN_ITEM_CLASS);
                      // viizcom they forgot to mark selected item as selected...
                      if (option.selected) newItem.classList.add(IS_SELECTED_CLASS);
                      // also add the text into the li searchTerms attribute, for search
                      newItem.setAttribute(
                          DROPDOWN_ITEM_SEARCH_TERMS_ATTRIBUE_NAME,
                          (option.value + option.textContent + option.innerText).replace(/ /i, '').toLowerCase()
                      );
                      // newItem.title = (option.value + option.textContent + option.innerText).replace(/ /i, '').toLowerCase();//lower case remove space
                      // viizCom End
                      if (option.disabled) {
                          newItem.classList.add(IS_DISABLED_CLASS);
                      }
                      newItem.innerHTML = option.text;
                      newItem.addEventListener('click', this._onItemSelection);
                      this._newDropdown.appendChild(newItem);
                      this._dropdownItems.push({
                          oldOption: option,
                          newItem: newItem
                      });
                  }

                  if (!reRender) {
                      // viizCom add search controls
                      this._searchControl = document.createElement('div');
                      this._searchControl.classList.add('is-hidden');
                      this._searchControl.classList.add('vi-SearchBox');
                      this._searchControl.style.top = 'auto';
                      this._searchControl.style.bottom = '-9px';
                      this._searchControl.style.height = 'auto';
                      this._searchControl.innerHTML =
              '<input class="vi-SearchBox-field" style="height:auto;" type="text" value="">\
  <label class="vi-SearchBox-label">\
    <i class="vi-SearchBox-icon vi-Icon vi-Icon--Search"></i>\
  </label>';
                      this._searchControlInput = this._searchControl.querySelector('input');
                      container.appendChild(this._searchControl);
                      // viizCom end

                      /** Add the new replacement dropdown */
                      container.appendChild(this._newDropdownLabel);
                      container.appendChild(this._newDropdown);
                      /** Add dropdown label helper for truncation */
                      container.appendChild(this._dropdownLabelHelper);
                      /** Toggle open/closed state of the dropdown when clicking its title. */
                      this._newDropdownLabel.addEventListener('click', this._onOpenDropdown);
                  }
                  this._checkTruncation();
                  if (!reRender) {
                      this._setWindowEvent();
                  }
              }
              Dropdown.prototype._setWindowEvent = function() {
                  var _this = this;
                  window.addEventListener(
                      'resize',
                      function() {
                          _this._doResize();
                          _this._checkTruncation();
                      },
                      false
                  );
              };
              Dropdown.prototype._checkTruncation = function() {
                  var selected = this._newDropdown.querySelectorAll('.' + IS_SELECTED_CLASS);
                  var origText = '';

                  try {
                      // empty dropdown will throw an error here.
                      if (this._multiple) {
                          for (var si = 0; si < selected.length; si++) {
                              elm = selected[si];
                              if (origText !== '') origText += ', ';
                              origText += elm.textContent;
                          }
                      } else {
                          origText =
                selected && selected.length > 0 ? selected[0].textContent : this._newDropdown.querySelectorAll('.' + DROPDOWN_ITEM_CLASS)[0].textContent;
                      }
                  } catch (e) {}

                  this._dropdownLabelHelper.textContent = origText;
                  if (this._dropdownLabelHelper.offsetHeight > this._newDropdownLabel.offsetHeight) {
                      var i = 0;
                      var ellipsis = '...';
                      var newText = void 0;
                      do {
                          i--;
                          newText = origText.slice(0, i);
                          this._dropdownLabelHelper.textContent = newText + ellipsis;
                      } while (newText.length > 0 && this._dropdownLabelHelper.offsetHeight > this._newDropdownLabel.offsetHeight);
                      // viizcom: added newText.length > 0 &&  to make sure if it still doesn't have enough space on empty text, this won't be an endless loop.
                  }
                  this._newDropdownLabel.textContent = this._dropdownLabelHelper.textContent;
              };
              Dropdown.prototype._getScreenSize = function() {
                  var w = window;
                  var wSize = {
                      x: 0,
                      y: 0
                  };
                  var d = document;
            var e = d.documentElement;
            var g = d.getElementsByTagName('body')[0];
                  wSize.x = w.innerWidth || e.clientWidth || g.clientWidth;
                  wSize.y = w.innerHeight || e.clientHeight || g.clientHeight;
                  return wSize;
              };
              Dropdown.prototype._doResize = function() {
                  var isOpen = this._container.classList.contains(IS_OPEN_CLASS);
                  if (!isOpen) {
                      return;
                  }
                  var screenSize = this._getScreenSize().x;
                  if (screenSize <= SMALL_MAX_WIDTH) {
                      this._openDropdownAsPanel();
                  } else {
                      this._removeDropdownAsPanel();
                  }
              };
              Dropdown.prototype._openDropdownAsPanel = function() {
                  if (this._panel === undefined) {
                      this._panelContainer = document.createElement('div');
                      this._panelContainer.classList.add(PANEL_CLASS);
                      this._panelContainer.classList.add(DROPDOWN_CLASS);
                      this._panelContainer.classList.add(IS_OPEN_CLASS);
                      this._panelContainer.classList.add(ANIMATE_IN_CLASS);
                      this._panelContainer.appendChild(this._newDropdown);
                      /** Assign the script to the new panel, which creates a panel host, overlay, and attaches it to the DOM */
                      this._panel = new fabric.Panel(this._panelContainer);
                  }
              };
              Dropdown.prototype._removeDropdownAsPanel = function(evt) {
                  var _this = this;
                  if (this._panel !== undefined) {
                      /** destroy panel and move dropdown back to outside the panel */
                      /* if event target is overlay element, only append dropdown to prevent */
                      /* double dismiss bug, otherwise, dismiss and append */
                      if (evt && evt.target === this._panel.panelHost.overlay.overlayElement) {
                          this._container.appendChild(this._newDropdown);
                      } else {
                          this._panel.dismiss(function() {
                              _this._container.appendChild(_this._newDropdown);
                          });
                      }
                      this._panel = undefined;
                  }
              };

              // viizCom this function is used for inline search in dropdown control
              Dropdown.prototype._onKeyDown = function(evt) {
                  var runSearch = false;
                  var hasvisibleOption = false;
                  evt = evt || window.event;
                  var keyId = evt.keyCode || evt.which;
                  if (evt.keyCode === 8) {
                      if (this.searchTerm.length > 0) {
                          this.searchTerm = this.searchTerm.substr(0, this.searchTerm.length - 1);
                          runSearch = true;
                      }
                  } else {
                      var char = String.fromCharCode(keyId); // in upper case
                      if ((char >= 'A' && char <= 'Z') || char === ' ' || (char >= '0' && char <= '9')) {
                          this.searchTerm += char.toLowerCase();
                          runSearch = true;

                          evt.cancelBubble = true;
                          evt.returnValue = false;
                      }
                  }

                  if (runSearch) {
                      if (this.searchTerm.length > 0) this._searchControl.classList.remove('is-hidden');
                      else this._searchControl.classList.add('is-hidden');
                      this._searchControlInput.value = this.searchTerm;

                      var searchTerms = this.searchTerm.split(' ');
                      for (var i = 0; i < this._dropdownItems.length; i++) {
                          var item = this._dropdownItems[i].newItem;
                          var itemTerms = item.getAttribute(DROPDOWN_ITEM_SEARCH_TERMS_ATTRIBUE_NAME) || '';
                          var found = itemTerms === '';
                          for (var j = 0; !found && j < searchTerms.length; j++) {
                              if (itemTerms.indexOf(searchTerms[j]) >= 0) {
                                  found = true;
                                  break;
                              }
                          }
                          if (found) {
                              item.classList.remove('is-hidden');
                              hasvisibleOption = true;
                          } else item.classList.add('is-hidden');
                      }
                      if (!hasvisibleOption) {
                          // todo: add message "no options available"
                      }
                  }
              };
              // end viizCom

              Dropdown.prototype._onOpenDropdown = function(evt) {
                  var isDisabled = this._container.classList.contains(IS_DISABLED_CLASS);
                  var isOpen = this._container.classList.contains(IS_OPEN_CLASS);
                  if (!isDisabled && !isOpen) {
                      /** Stop the click event from propagating, which would just close the dropdown immediately. */
                      evt.stopPropagation();
                      this._closeOtherDropdowns();
                      /** Go ahead and open that dropdown. */
                      this._container.classList.add(IS_OPEN_CLASS);
                      /** Temporarily bind an event to the document that will close this dropdown when clicking anywhere. */
                      document.addEventListener('click', this._onCloseDropdown);
                      var screenSize = this._getScreenSize().x;
                      if (screenSize <= SMALL_MAX_WIDTH) {
                          this._openDropdownAsPanel();
                      }

                      /*viizCom add support for type-in search */
                      // remove is-hidden class from all choices
                      for (var i = 0; i < this._dropdownItems.length; i++) {
                          var item = this._dropdownItems[i];
                          item.newItem.classList.remove('is-hidden');
                      }
                      // reset search term
                      this.searchTerm = '';
                      // add event listener
                      document.addEventListener('keydown', this._onKeyDown);
                      // viizCom End
                  }
              };
              Dropdown.prototype._closeOtherDropdowns = function() {
                  var dropdowns = document.querySelectorAll('.' + DROPDOWN_CLASS + '.' + IS_OPEN_CLASS);
                  for (var i = 0; i < dropdowns.length; i++) {
                      dropdowns[i].classList.remove(IS_OPEN_CLASS);
                  }
              };
              Dropdown.prototype._onCloseDropdown = function(evt) {
                  this._removeDropdownAsPanel(evt);
                  this._container.classList.remove(IS_OPEN_CLASS);
                  document.removeEventListener('click', this._onCloseDropdown);
                  // viizCom remove search listener
                  document.removeEventListener('keydown', this._onKeyDown);
                  // hide search control
                  this._searchControl.classList.add('is-hidden');
                  // viizcom end
              };
              Dropdown.prototype._onItemSelection = function(evt) {
                  if (this._multiple) {
                      // prevent document click handler from closing the popup, in multi select the user can select more than one item at a time.
                      evt.cancelBubble = true;
                      evt.returnValue = false;
                      evt.stopPropagation && evt.stopPropagation();
                      evt.preventDefault && evt.preventDefault();
                  }

                  var item = evt.target;
                  var isDropdownDisabled = this._container.classList.contains(IS_DISABLED_CLASS);
                  var isOptionDisabled = item.classList.contains(IS_DISABLED_CLASS);
                  this._newDropdownLabel.innerHTML = '';
                  // set the item's selected state and class.
                  var setSelected = function(dropDownItem, selected) {
                      if (selected) {
                          dropDownItem.newItem.classList.add(IS_SELECTED_CLASS);
                          dropDownItem.oldOption.selected = true;
                      } else {
                          dropDownItem.newItem.classList.remove(IS_SELECTED_CLASS);
                          dropDownItem.oldOption.selected = false;
                      }
                  };
                  if (!isDropdownDisabled && !isOptionDisabled) {
                      /** Deselect all items and select this one. */
                      /** Update the original dropdown. */
                      for (var i = 0; i < this._dropdownItems.length; ++i) {
                          if (this._dropdownItems[i].newItem === item) {
                              if (this._multiple) {
                                  // toggle
                                  setSelected(this._dropdownItems[i], !this._dropdownItems[i].oldOption.selected);
                              } else {
                                  setSelected(this._dropdownItems[i], true);
                              }
                          } else if (!this._multiple) {
                              setSelected(this._dropdownItems[i], false);
                          }

                          if (this._dropdownItems[i].oldOption.selected) {
                              if (this._newDropdownLabel.innerHTML !== '') this._newDropdownLabel.innerHTML += ', ';
                              this._newDropdownLabel.innerHTML += this._dropdownItems[i].oldOption.textContent;
                          }
                      }
                      /** Update the replacement dropdown's title. */
                      this._newDropdownLabel.innerHTML = item.textContent;
                      this._checkTruncation();
                      /** Trigger any change event tied to the original dropdown. */
                      var changeEvent = document.createEvent('HTMLEvents');
                      changeEvent.initEvent('change', false, true);
                      this._originalDropdown.dispatchEvent(changeEvent);
                  }
              };
              return Dropdown;
          })();
          fabric.Dropdown = Dropdown;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      // "use strict";
      var fabric;
      (function(fabric) {
      /**
       *
       * Adds basic demonstration functionality to .vi-PersonaCard components.
       *
       */
          var PersonaCard = (function() {
              /**
         *
         * @param {Element} container - the target container for an instance of PersonaCard
         * @constructor
         */
              function PersonaCard(container) {
                  this._container = container;
                  var activeElement = this._container.querySelector('.vi-PersonaCard-action.is-active');
                  if (activeElement === null) {
                      // viizcom: don't fail if nothing selected by default, select first and continue
                      activeElement = this._container.querySelector('.vi-PersonaCard-action'); // get first
                      activeElement.classList.add('is-active'); // set it as active
                  }
                  var activeId = activeElement.getAttribute('data-action-id');
                  this._actions = this._container.querySelector('.vi-PersonaCard-actions');
                  this._expander = this._container.querySelector('.vi-PersonaCard-detailExpander');
                  this._actionDetailBox = this._container.querySelector('.vi-PersonaCard-actionDetailBox');
                  this._setDetail(activeId);
                  this._boundOnActionClick = this._onActionClick.bind(this);
                  this._boundOnExpanderClick = this._onExpanderClick.bind(this);
                  this._boundOnTab = this._onTab.bind(this);
                  this._addListeners();
              }
              PersonaCard.prototype.removeListeners = function() {
                  this._actions.removeEventListener('click', this._boundOnActionClick);
                  // viizcom: check if expander is null, might not added one
                  this._expander && this._expander.removeEventListener('click', this._boundOnExpanderClick);
                  this._container.removeEventListener('keydown', this._boundOnTab);
              };
              PersonaCard.prototype._addListeners = function() {
                  this._actions.addEventListener('click', this._boundOnActionClick, false);
                  // viizcom: check if expander is null, might not added one
                  this._expander && this._expander.addEventListener('click', this._boundOnExpanderClick, false);
                  this._container.addEventListener('keydown', this._boundOnTab, false);
              };
              PersonaCard.prototype._onTab = function(event) {
                  var target = event.target;
                  if (event.keyCode === 9 && target.classList.contains('vi-PersonaCard-action')) {
                      this._onActionClick(event);
                  }
              };
              PersonaCard.prototype._onExpanderClick = function(event) {
                  var parent = event.target.parentElement;
                  if (parent.classList.contains('is-collapsed')) {
                      parent.classList.remove('is-collapsed');
                  } else {
                      parent.classList.add('is-collapsed');
                  }
                  var parentHeight = parent.clientHeight;
                  this._animateDetail(parentHeight);
              };
              PersonaCard.prototype._onActionClick = function(event) {
                  var target = event.target;
                  var actionId = target.getAttribute('data-action-id');
                  if (actionId && target.className.indexOf('is-active') === -1) {
                      this._setAction(target);
                      this._setDetail(actionId);
                  }
              };
              PersonaCard.prototype._setAction = function(target) {
                  var activeElement = this._container.querySelector('.vi-PersonaCard-action.is-active');
                  activeElement.classList.remove('is-active');
                  target.classList.add('is-active');
              };
              PersonaCard.prototype._setDetail = function(activeId) {
                  var selector = ".vi-PersonaCard-details[data-detail-id='" + activeId + "']";
                  var lastDetail = this._container.querySelector('.vi-PersonaCard-details.is-active');
                  var activeDetail = this._container.querySelector(selector);
                  if (lastDetail) {
                      lastDetail.classList.remove('is-active');
                  }
                  activeDetail.classList.add('is-active');
                  var detailHeight = activeDetail.clientHeight;
                  this._animateDetail(detailHeight);
              };
              PersonaCard.prototype._animateDetail = function(height) {
                  var _this = this;
                  this._actionDetailBox.style.overflowY = 'hidden';
                  fabric.Animate.transition(this._actionDetailBox, {
                      height: height,
                      duration: 0.25,
                      ease: fabric.Ease.SINE_EASE_OUT,
                      onEnd: function() {
                          _this._actionDetailBox.style.overflowY = 'auto';
                      }
                  });
              };
              return PersonaCard;
          })();
          fabric.PersonaCard = PersonaCard;
      })(fabric || (fabric = {}));

      /**
     * FacePile
     *
     * A host for FacePile
     *
     */
      var fabric;
      (function(fabric) {
      // const CONTEXTUAL_HOST_CLASS = ".vi-ContextualHost";
          var MODAL_POSITION = 'top';
          var Persona = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of FacePile
         * @constructor
         */
              function Persona(container) {
                  this._persona = container;
                  // If Persona Card and Contextual host exist continue
                  // this._contextualHost = this._persona.querySelector(CONTEXTUAL_HOST_CLASS);
                  this._personaCard = this._persona.querySelector('.vi-PersonaCard');
                  if (this._personaCard) {
                      this._assignEvents();
                      this._personaCard.setAttribute('style', 'display: none;');
                      this._createPersonaCard();
                  }
              }
              Persona.prototype._createPersonaCard = function() {
                  this._personaCardInstance = new fabric.PersonaCard(this._personaCard);
              };
              Persona.prototype._createContextualHostInstance = function() {
                  this._personaCard.setAttribute('style', 'display: block;');
                  this._contextualHostInstance = new fabric.ContextualHost(this._personaCard, MODAL_POSITION, this._persona);
              };
              Persona.prototype._personaEventHandler = function() {
                  this._createContextualHostInstance();
              };
              Persona.prototype._assignEvents = function() {
                  var _this = this;
                  this._persona.addEventListener('click', this._personaEventHandler.bind(this), false);
                  this._persona.addEventListener(
                      'keyup',
                      function(e) {
                          return e.keyCode === 32 ? _this._personaEventHandler() : null;
                      },
                      false
                  );
              };
              return Persona;
          })();
          fabric.Persona = Persona;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
      /**
       * FacePile
       *
       * A host for FacePile
       *
       */
          var PERSONA_CLASS = '.vi-Persona--facePile';
          var PERSONA_INITIALS = '.vi-Persona-initials';
          var PERSONA_IMAGE = '.vi-Persona-image';
          var PERSONA_PRIMARY_CLASS = '.vi-Persona-primaryText';
          var PERSONA_SECONDARY_CLASS = '.vi-Persona-secondaryText';
          var FacePile = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of FacePile
         * @constructor
         */
              function FacePile(container) {
                  this._personaCollection = [];
                  this._facePile = container;
                  this._createPersonaCollection();
              }
              FacePile.prototype._createPersonaCollection = function() {
                  var _personas = document.querySelectorAll(PERSONA_CLASS);
                  for (var i = 0; i < _personas.length; i++) {
                      var _thisPersona = _personas[i];
                      this._personaCollection.push({
                          item: _thisPersona,
                          initials: _thisPersona.querySelector(PERSONA_INITIALS).textContent,
                          image: _thisPersona.querySelector(PERSONA_IMAGE) ? _thisPersona.querySelector(PERSONA_IMAGE).getAttribute('src') : null,
                          primaryText: _thisPersona.querySelector(PERSONA_PRIMARY_CLASS) ? _thisPersona.querySelector(PERSONA_PRIMARY_CLASS).textContent : '',
                          secondaryText: _thisPersona.querySelector(PERSONA_SECONDARY_CLASS) ? _thisPersona.querySelector(PERSONA_SECONDARY_CLASS).textContent : '',
                          personaInstance: new fabric.Persona(_thisPersona)
                      });
                  }
              };
              return FacePile;
          })();
          fabric.FacePile = FacePile;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * List Item Plugin
       *
       * Adds basic demonstration functionality to .vi-ListItem components.
       *
       */
          var ListItem = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of ListItem
         * @constructor
         */
              function ListItem(container) {
                  this._container = container;
                  this._toggleElement = this._container.querySelector('.vi-ListItem-selectionTarget');
                  this._addListeners();
              }
              ListItem.prototype.removeListeners = function() {
                  this._toggleElement.removeEventListener('click', this._toggleHandler.bind(this));
              };
              ListItem.prototype._addListeners = function() {
                  this._toggleElement.addEventListener('click', this._toggleHandler.bind(this), false);
              };
              ListItem.prototype._toggleHandler = function() {
                  this._container.classList.toggle('is-selected');
              };
              return ListItem;
          })();
          fabric.ListItem = ListItem;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * List Item Plugin
       *
       * Adds basic demonstration functionality to .vi-List components.
       *
       */
          var List = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of List
         * @constructor
         */
              function List(container) {
                  this._container = container;
                  this._listItemComponents = [];
                  var choiceFieldElements = this._container.querySelectorAll('.vi-ListItem');
                  for (var i = 0; i < choiceFieldElements.length; i++) {
                      this._listItemComponents[i] = new fabric.ListItem(choiceFieldElements[i]);
                  }
              }
              return List;
          })();
          fabric.List = List;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
          'use strict';
          /**
       * MessageBanner component
       *
       * A component to display error messages
       *
       */
          var MessageBanner = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of MessageBanner
         * @constructor
         */
              function MessageBanner(container) {
                  this._textContainerMaxWidth = 700;
                  this._bufferElementsWidth = 88;
                  this._bufferElementsWidthSmall = 35;
                  this.SMALL_BREAK_POINT = 480;
                  this.container = container;
                  this.init();
              }
              /**
         * initializes component
         */
              MessageBanner.prototype.init = function() {
                  this._cacheDOM();
                  this._setListeners();
                  this._clientWidth = this._errorBanner.offsetWidth;
                  this._initTextWidth = this._clipper.offsetWidth;
                  this._onResize();
              };
              /**
         * shows banner if the banner is hidden
         */
              MessageBanner.prototype.showBanner = function() {
                  this._errorBanner.className = 'vi-MessageBanner';
              };
              /**
         * sets styles on resize
         */
              MessageBanner.prototype._onResize = function() {
                  this._clientWidth = this._errorBanner.offsetWidth;
                  if (window.innerWidth >= this.SMALL_BREAK_POINT) {
                      this._resizeRegular();
                  } else {
                      this._resizeSmall();
                  }
              };
              /**
         * resize above 480 pixel breakpoint
         */
              MessageBanner.prototype._resizeRegular = function() {
                  if (this._clientWidth - this._bufferSize > this._initTextWidth && this._initTextWidth < this._textContainerMaxWidth) {
                      this._textWidth = 'auto';
                      this._chevronButton.className = 'vi-MessageBanner-expand';
                      this._collapse();
                  } else {
                      this._textWidth = Math.min(this._clientWidth - this._bufferSize, this._textContainerMaxWidth) + 'px';
                      if (this._chevronButton.className.indexOf('is-visible') === -1) {
                          this._chevronButton.className += ' is-visible';
                      }
                  }
                  this._clipper.style.width = this._textWidth;
              };
              /**
         * resize below 480 pixel breakpoint
         */
              MessageBanner.prototype._resizeSmall = function() {
                  if (this._clientWidth - (this._bufferElementsWidthSmall + this._closeButton.offsetWidth) > this._initTextWidth) {
                      this._textWidth = 'auto';
                      this._collapse();
                  } else {
                      this._textWidth = this._clientWidth - (this._bufferElementsWidthSmall + this._closeButton.offsetWidth) + 'px';
                  }
                  this._clipper.style.width = this._textWidth;
              };
              /**
         * caches elements and values of the component
         */
              MessageBanner.prototype._cacheDOM = function() {
                  this._errorBanner = this.container;
                  this._clipper = this.container.querySelector('.vi-MessageBanner-clipper');
                  this._chevronButton = this.container.querySelector('.vi-MessageBanner-expand');
                  this._actionButton = this.container.querySelector('.vi-MessageBanner-action');
                  this._bufferSize = this._actionButton.offsetWidth + this._bufferElementsWidth;
                  this._closeButton = this.container.querySelector('.vi-MessageBanner-close');
              };
              /**
         * expands component to show full error message
         */
              MessageBanner.prototype._expand = function() {
                  var icon = this._chevronButton.querySelector('.vi-Icon');
                  this._errorBanner.className += ' is-expanded';
                  icon.className = 'vi-Icon vi-Icon--DoubleChevronUp';
              };
              /**
         * collapses component to only show truncated message
         */
              MessageBanner.prototype._collapse = function() {
                  var icon = this._chevronButton.querySelector('.vi-Icon');
                  this._errorBanner.className = 'vi-MessageBanner';
                  icon.className = 'vi-Icon vi-Icon--DoubleChevronDown';
              };
              MessageBanner.prototype._toggleExpansion = function() {
                  if (this._errorBanner.className.indexOf('is-expanded') > -1) {
                      this._collapse();
                  } else {
                      this._expand();
                  }
              };
              MessageBanner.prototype._hideMessageBanner = function() {
                  this._errorBanner.className = 'vi-MessageBanner is-hidden';
              };
              /**
         * hides banner when close button is clicked
         */
              MessageBanner.prototype._hideBanner = function() {
                  if (this._errorBanner.className.indexOf('hide') === -1) {
                      this._errorBanner.className += ' hide';
                      setTimeout(this._hideMessageBanner.bind(this), 500);
                  }
              };
              /**
         * sets handlers for resize and button click events
         */
              MessageBanner.prototype._setListeners = function() {
                  window.addEventListener('resize', this._onResize.bind(this), false);
                  this._chevronButton.addEventListener('click', this._toggleExpansion.bind(this), false);
                  this._closeButton.addEventListener('click', this._hideBanner.bind(this), false);
              };
              return MessageBanner;
          })();
          fabric.MessageBanner = MessageBanner;
      })(fabric || (fabric = {})); // end fabric namespace

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      var fabric;
      (function(fabric) {
      /**
       * People Picker
       *
       * People picker control
       *
       */
          var MODAL_POSITION = 'bottom';
          var TOKEN_CLASS = 'vi-Persona--token';
          var PeoplePicker = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of People Picker
         * @constructor
         */
              function PeoplePicker(container) {
                  this._container = container;
                  this._peoplePickerMenu = this._container.querySelector('.vi-PeoplePicker-results');
                  this._peoplePickerSearch = this._container.querySelector('.vi-TextField-field');
                  this._peoplePickerSearchBox = this._container.querySelector('.vi-PeoplePicker-searchBox');
                  this._selectedPeople = this._container.querySelector('.vi-PeoplePicker-selectedPeople');
                  this._assignClicks();
                  if (this._selectedPeople) {
                      this._assignRemoveHandler();
                      this._selectedCount = this._container.querySelector('.vi-PeoplePicker-selectedCount');
                      this._selectedPlural = this._container.querySelector('.vi-PeoplePicker-selectedCountPlural');
                  }
                  if (this._peoplePickerMenu) {
                      this._peoplePickerMenu.setAttribute('style', 'display: none;');
                  }
              }
              PeoplePicker.prototype._createModalHost = function(e) {
                  e.stopPropagation();
                  this._peoplePickerMenu.setAttribute('style', 'display: block;');
                  this._contextualHostView = new fabric.ContextualHost(
                      this._peoplePickerMenu,
                      MODAL_POSITION,
                      this._peoplePickerSearchBox,
                      false,
                      [''],
                      true,
                      this._contextHostCallBack.bind(this)
                  );
                  this._peoplePickerSearchBox.classList.add('is-active');
                  this._isContextualMenuOpen = true;
              };
              PeoplePicker.prototype._clickHandler = function(e) {
                  this._createModalHost(e);
                  // Select all results and remove event listeners by cloning
                  var peoplePickerResults = this._peoplePickerMenu.querySelector('.vi-PeoplePicker-result');
                  var resultsParent = peoplePickerResults.parentNode;
                  var resultsClone = resultsParent.cloneNode(true);
                  resultsParent.parentNode.replaceChild(resultsClone, resultsParent);
                  // Get all results
                  this._peoplePickerResults = this._peoplePickerMenu.querySelectorAll('.vi-PeoplePicker-result');
                  // Add _selectResult listeners to each result
                  for (var i = 0; i < this._peoplePickerResults.length; i++) {
                      var personaResult = this._peoplePickerResults[i].querySelector('.vi-Persona');
                      var removeButton = this._peoplePickerResults[i].querySelector('.vi-PeoplePicker-resultAction');
                      personaResult.addEventListener('click', this._selectResult.bind(this), true);
                      removeButton.addEventListener('click', this._removeItem.bind(this), true);
                  }
              };
              PeoplePicker.prototype._selectResult = function(e) {
                  e.stopPropagation();
                  var currentResult = this._findElement(e.target, 'vi-Persona');
                  var clonedResult = currentResult.cloneNode(true);
                  // if facePile - add to members list / else tokenize
                  if (this._container.classList.contains('vi-PeoplePicker--facePile')) {
                      this._addResultToMembers(clonedResult);
                  } else {
                      this._tokenizeResult(clonedResult);
                  }
                  this._updateCount();
                  // Close the open contextual host
                  this._contextualHostView.disposeModal();
              };
              PeoplePicker.prototype._findElement = function(childObj, className) {
                  var currentElement = childObj.parentNode;
                  while (!currentElement.classList.contains(className)) {
                      currentElement = currentElement.parentNode;
                  }
                  return currentElement;
              };
              PeoplePicker.prototype._addRemoveBtn = function(persona, token) {
                  var actionBtn;
                  var actionIcon = document.createElement('i');
                  if (token) {
                      actionBtn = document.createElement('div');
                      actionBtn.classList.add('vi-Persona-actionIcon');
                      actionBtn.addEventListener('click', this._removeToken.bind(this), true);
                  } else {
                      actionBtn = document.createElement('button');
                      actionBtn.classList.add('vi-PeoplePicker-resultAction');
                      actionBtn.addEventListener('click', this._removeResult.bind(this), true);
                  }
                  actionIcon.classList.add('vi-Icon', 'vi-Icon--Cancel');
                  actionBtn.appendChild(actionIcon);
                  persona.appendChild(actionBtn);
              };
              PeoplePicker.prototype._removeToken = function(e) {
                  var currentToken = this._findElement(e.target, 'vi-Persona');
                  currentToken.remove();
              };
              PeoplePicker.prototype._removeResult = function(e) {
                  var currentResult = this._findElement(e.target, 'vi-PeoplePicker-selectedPerson');
                  currentResult.remove();
                  this._updateCount();
              };
              PeoplePicker.prototype._removeItem = function(e) {
                  var currentItem = this._findElement(e.target, 'vi-PeoplePicker-result');
                  currentItem.remove();
              };
              PeoplePicker.prototype._updateCount = function() {
                  if (this._selectedPeople) {
                      var count = this._selectedPeople.querySelectorAll('.vi-PeoplePicker-selectedPerson').length;
                      this._selectedCount.textContent = count.toString();
                      this._selectedPlural.style.display = count === 1 ? 'none' : 'inline';
                  }
              };
              PeoplePicker.prototype._tokenizeResult = function(tokenResult) {
                  var searchBox = this._container.querySelector('.vi-PeoplePicker-searchBox');
                  var textField = searchBox.querySelector('.vi-TextField');
                  // Add token classes to persona
                  tokenResult.classList.add(TOKEN_CLASS, 'vi-PeoplePicker-persona');
                  // Add the remove button to the token
                  this._addRemoveBtn(tokenResult, true);
                  // Use persona xs variant for token
                  if (tokenResult.classList.contains('vi-Persona--sm')) {
                      tokenResult.classList.remove('vi-Persona--sm');
                      tokenResult.classList.add('vi-Persona--xs');
                  }
                  // Prepend the token before the search field
                  searchBox.insertBefore(tokenResult, textField);
              };
              PeoplePicker.prototype._addResultToMembers = function(persona) {
                  var membersList = this._container.querySelector('.vi-PeoplePicker-selectedPeople');
                  var firstMember = membersList.querySelector('.vi-PeoplePicker-selectedPerson');
                  var selectedItem = document.createElement('li');
                  // Create the selectedPerson list item
                  selectedItem.classList.add('vi-PeoplePicker-selectedPerson');
                  selectedItem.tabIndex = 1;
                  // Append the result persona to list item
                  selectedItem.appendChild(persona);
                  // Add the remove button to the persona
                  this._addRemoveBtn(selectedItem, false);
                  // Add removeResult event to resultAction
                  selectedItem.querySelector('.vi-PeoplePicker-resultAction').addEventListener('click', this._removeResult.bind(this), true);
                  membersList.insertBefore(selectedItem, firstMember);
              };
              PeoplePicker.prototype._assignClicks = function() {
                  var _this = this;
                  this._peoplePickerSearch.addEventListener('click', this._clickHandler.bind(this), true);
                  this._peoplePickerSearch.addEventListener(
                      'keyup',
                      function(e) {
                          if (e.keyCode !== 27 && !_this._isContextualMenuOpen) {
                              _this._clickHandler(e);
                          }
                      },
                      true
                  );
              };
              PeoplePicker.prototype._assignRemoveHandler = function() {
                  var selectedPeople = this._selectedPeople.querySelectorAll('.vi-PeoplePicker-selectedPerson');
                  for (var i = 0; i < selectedPeople.length; i++) {
                      selectedPeople[i].querySelector('.vi-PeoplePicker-resultAction').addEventListener('click', this._removeResult.bind(this), true);
                  }
              };
              PeoplePicker.prototype._contextHostCallBack = function() {
                  this._peoplePickerSearchBox.classList.remove('is-active');
                  this._isContextualMenuOpen = false;
              };
              return PeoplePicker;
          })();
          fabric.PeoplePicker = PeoplePicker;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * Pivot Plugin
       *
       * Adds basic demonstration functionality to .vi-Pivot components.
       *
       */
          var Pivot = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Pivot
         * @constructor
         */
              function Pivot(container) {
                  // viizCom ignore controls with vi--ignore, allow for manual controls.
                  if (container.className.indexOf('vi--ignore') >= 0) return;

                  this._container = container;
                  this._addListeners();

                  // viizCom: no... don't show the first one always... look for a tab that has "is-selected" and show it. if none- select the first tab and show it.
                  /// / Show the first pivot's content
                  // var firstContent = this._container.querySelector(".vi-Pivot-content");
                  // firstContent.style.display = "block";
                  var eLinks = this._container.querySelector('.vi-Pivot-links');
                  var eLinkArr = eLinks.querySelectorAll('.vi-Pivot-link');
                  if (eLinkArr && eLinkArr.length) {
                      var selectedTab = eLinkArr[0];
                      for (var i = 0; i < eLinkArr.length; i++) {
                          if (eLinkArr[i].classList.contains('is-selected')) {
                              selectedTab = eLinkArr[i];
                              break;
                          }
                      }
                      this._selectTab(selectedTab);
                  }
                  // viizCom end
              }
              Pivot.prototype.removeListeners = function() {
                  this._container.removeEventListener('click', this._selectTab.bind(this));
              };
              Pivot.prototype._addListeners = function() {
                  var _this = this;
                  this._container.querySelector('.vi-Pivot-links').addEventListener('click', this._selectTabMouse.bind(this), false);
                  this._container.addEventListener(
                      'keyup',
                      function(event) {
                          if (event.keyCode === 13) {
                              _this._selectTabKeyboard(event);
                          }
                      },
                      true
                  );
              };
              Pivot.prototype._selectTab = function(selectedTab) {
                  // Only if its a pivot link and if it doesn't have ellipsis
                  if (selectedTab.classList.contains('vi-Pivot-link') && !selectedTab.querySelector('.vi-Pivot-ellipsis')) {
                      // Iterate over siblings and un-select them
                      var sibling = selectedTab.parentElement.firstElementChild;
                      while (sibling) {
                          sibling.classList.remove('is-selected');
                          sibling = sibling.nextElementSibling;
                      }
                      // Select the clicked tab
                      selectedTab.classList.add('is-selected');
                      // Hide all of the content
                      var containers = this._container.querySelectorAll('.vi-Pivot-content');
                      Array.prototype.forEach.call(containers, function(el, i) {
                          el.style.display = 'none';
                      });
                      // Show the content that corresponds to the selected tab
                      var selectedContentName = selectedTab.getAttribute('data-content');
                      var selectedContent = this._container.querySelector(".vi-Pivot-content[data-content='" + selectedContentName + "']");
                      selectedContent.style.display = 'block';
                  }
              };
              Pivot.prototype._selectTabMouse = function(event) {
                  event.preventDefault();
                  var selectedTab = event.target;
                  this._selectTab(selectedTab);
              };
              Pivot.prototype._selectTabKeyboard = function(event) {
                  event.preventDefault();
                  var selectedTab = event.target;
                  this._selectTab(selectedTab);
              };
              return Pivot;
          })();
          fabric.Pivot = Pivot;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
          'use strict';
          /**
       * ProgressIndicator component
       *
       * A component for outputting determinate progress
       *
       */
          var ProgressIndicator = (function() {
              /**
         *
         * @param {HTMLDivElement} container - the target container for an instance of ProgressIndicator
         * @constructor
         */
              function ProgressIndicator(container) {
                  this.container = container;
                  this.cacheDOM();
              }
              /**
         * Sets the progress percentage for a determinate
         * operation. Either use this or setProgress
         * and setTotal as setProgressPercent assumes
         * you've done a percentage calculation before
         * injecting it into the function
         * @param {number} percent - a floating point number from 0 to 1
         */
              ProgressIndicator.prototype.setProgressPercent = function(percent) {
                  this._progressBar.style.width = Math.round(this._itemProgress.offsetWidth * percent) + 'px';
              };
              /**
         * Sets the progress for a determinate operation.
         * Use this in combination with setTotal.
         * @param {number} progress
         */
              ProgressIndicator.prototype.setProgress = function(progress) {
                  this._progress = progress;
                  var percentage = this._progress / this._total;
                  this.setProgressPercent(percentage);
              };
              /**
         * Sets the total file size, etc. for a
         * determinate operation. Use this in
         * combination with setProgress
         * @param {number} total
         */
              ProgressIndicator.prototype.setTotal = function(total) {
                  this._total = total;
              };
              /**
         * Sets the text for the title or label
         * of an instance
         * @param {string} name
         */
              ProgressIndicator.prototype.setName = function(name) {
                  this._itemName.innerHTML = name;
              };
              /**
         * Sets the text for a description
         * of an instance
         * @param {string} name
         */
              ProgressIndicator.prototype.setDescription = function(description) {
                  this._itemDescription.innerHTML = description;
              };
              /**
         * caches elements and values of the component
         *
         */
              ProgressIndicator.prototype.cacheDOM = function() {
                  // an itemName element is optional
                  this._itemName = this.container.querySelector('.vi-ProgressIndicator-itemName') || null;
                  // an itemDescription element is optional
                  this._itemDescription = this.container.querySelector('.vi-ProgressIndicator-itemDescription') || null;
                  this._progressBar = this.container.querySelector('.vi-ProgressIndicator-progressBar');
                  this._itemProgress = this.container.querySelector('.vi-ProgressIndicator-itemProgress');
              };
              return ProgressIndicator;
          })();
          fabric.ProgressIndicator = ProgressIndicator;
      })(fabric || (fabric = {})); // end fabric namespace

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
          var CircleObject = (function() {
              function CircleObject(element, j) {
                  this.element = element;
                  this.j = j;
              }
              return CircleObject;
          })();
          /**
       * Spinner Component
       *
       * An animating activity indicator.
       *
       */
          var Spinner = (function() {
              /**
         * @param {HTMLDOMElement} target - The element the Spinner will attach itself to.
         */
              function Spinner(container) {
                  this.eightSize = 0.2;
                  this.animationSpeed = 90;
                  this.parentSize = 20;
                  this.fadeIncrement = 0;
                  this.circleObjects = [];
                  this._target = container;
                  this._init();
              }
              /**
         * @function start - starts or restarts the animation sequence
         * @memberOf fabric.Spinner
         */
              Spinner.prototype.start = function() {
                  var _this = this;
                  this.stop();
                  this.interval = setInterval(function() {
                      var i = _this.circleObjects.length;
                      while (i--) {
                          _this._fade(_this.circleObjects[i]);
                      }
                  }, this.animationSpeed);
              };
              /**
         * @function stop - stops the animation sequence
         * @memberOf fabric.Spinner
         */
              Spinner.prototype.stop = function() {
                  clearInterval(this.interval);
              };
              // private methods
              Spinner.prototype._init = function() {
                  this._setTargetElement();
                  this._setPropertiesForSize();
                  this._createCirclesAndArrange();
                  this._initializeOpacities();
                  this.start();
              };
              Spinner.prototype._setPropertiesForSize = function() {
                  if (this.spinner.className.indexOf('large') > -1) {
                      this.parentSize = 28;
                      this.eightSize = 0.179;
                  }
                  this.offsetSize = this.eightSize;
                  this.numCircles = 8;
              };
              Spinner.prototype._setTargetElement = function() {
                  // for bacviards compatibility
                  if (this._target.className.indexOf('vi-Spinner') === -1) {
                      this.spinner = document.createElement('div');
                      this.spinner.className = 'vi-Spinner';
                      this._target.appendChild(this.spinner);
                  } else {
                      this.spinner = this._target;
                  }
              };
              Spinner.prototype._initializeOpacities = function() {
                  var i = 0;
                  var j = 1;
                  var opacity;
                  this.fadeIncrement = 1 / this.numCircles;
                  for (i; i < this.numCircles; i++) {
                      var circleObject = this.circleObjects[i];
                      opacity = this.fadeIncrement * j++;
                      this._setOpacity(circleObject.element, opacity);
                  }
              };
              Spinner.prototype._fade = function(circleObject) {
                  var opacity = this._getOpacity(circleObject.element) - this.fadeIncrement;
                  if (opacity <= 0) {
                      opacity = 1;
                  }
                  this._setOpacity(circleObject.element, opacity);
              };
              Spinner.prototype._getOpacity = function(element) {
                  return parseFloat(window.getComputedStyle(element).getPropertyValue('opacity'));
              };
              Spinner.prototype._setOpacity = function(element, opacity) {
                  element.style.opacity = opacity.toString();
              };
              Spinner.prototype._createCircle = function() {
                  var circle = document.createElement('div');
                  circle.className = 'vi-Spinner-circle';
                  circle.style.width = circle.style.height = this.parentSize * this.offsetSize + 'px';
                  return circle;
              };
              Spinner.prototype._createCirclesAndArrange = function() {
                  var angle = 0;
                  var offset = this.parentSize * this.offsetSize;
                  var step = (2 * Math.PI) / this.numCircles;
                  var i = this.numCircles;
                  var circleObject;
                  var radius = (this.parentSize - offset) * 0.5;
                  while (i--) {
                      var circle = this._createCircle();
                      var x = Math.round(this.parentSize * 0.5 + radius * Math.cos(angle) - circle.clientWidth * 0.5) - offset * 0.5;
                      var y = Math.round(this.parentSize * 0.5 + radius * Math.sin(angle) - circle.clientHeight * 0.5) - offset * 0.5;
                      this.spinner.appendChild(circle);
                      circle.style.left = x + 'px';
                      circle.style.top = y + 'px';
                      angle += step;
                      circleObject = new CircleObject(circle, i);
                      this.circleObjects.push(circleObject);
                  }
              };
              return Spinner;
          })();
          fabric.Spinner = Spinner;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      /**
     * @namespace fabric
     */
      var fabric;
      (function(fabric) {
          'use strict';
          var Table = (function() {
              function Table(container) {
                  this.container = container;
                  // Is the table selectable?
                  if (this.container.className.indexOf('vi-Table--selectable') !== -1) {
                      this._addListeners();
                  }
              }
              /**
         * Add event listeners
         */
              Table.prototype._addListeners = function() {
                  this.container.addEventListener('click', this._toggleRowSelection.bind(this), false);
              };
              /**
         * Select or deselect a row
         */
              Table.prototype._toggleRowSelection = function(event) {
                  var selectedRow = event.target.parentElement;
                  var selectedStateClass = 'is-selected';
                  // Toggle the selected state class
                  if (selectedRow.className === selectedStateClass) {
                      selectedRow.className = '';
                  } else {
                      selectedRow.className = selectedStateClass;
                  }
              };
              return Table;
          })();
          fabric.Table = Table;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
          var TextFieldConsts;
          (function(TextFieldConsts) {
              (function(Type) {
                  Type[(Type['Placeholder'] = 0)] = 'Placeholder';
                  Type[(Type['Underlined'] = 1)] = 'Underlined';
              })(TextFieldConsts.Type || (TextFieldConsts.Type = {}));
              var Type = TextFieldConsts.Type;
          })(TextFieldConsts || (TextFieldConsts = {}));
          /**
       * Text Field Plugin
       *
       * Adds basic demonstration functionality to .vi-TextField components.
       */
          var TextField = (function() {
              /**
         *
         * @param {HTMLDivElement} container - the target container for an instance of TextField
         * @constructor
         */
              function TextField(container) {
                  this._container = container;
                  this._type = [];
                  this._textField = this._container.querySelector('.vi-TextField-field');
                  this._textFieldLabel = this._container.querySelector('.vi-Label');
                  this._setTextFieldType();
                  this._addListeners();
              }
              /** Populate _type with various kinds of text fields */
              TextField.prototype._setTextFieldType = function() {
                  if (this._container.classList.contains('vi-TextField--placeholder')) {
                      this._type.push(TextFieldConsts.Type.Placeholder);
                  }
                  if (this._container.classList.contains('vi-TextField--underlined')) {
                      this._type.push(TextFieldConsts.Type.Underlined);
                  }
              };
              /** Add event listeners according to the type(s) of text field */
              TextField.prototype._addListeners = function() {
                  var _this = this;
                  // Ensure that the text box gets focus when the label is clicked.
                  this._textFieldLabel &&
            this._textFieldLabel.addEventListener('click', function(event) {
                _this._textField.focus();
            });
                  /** Placeholder - hide/unhide the placeholder  */
                  if (this._type.indexOf(TextFieldConsts.Type.Placeholder) >= 0) {
                      this._textField.addEventListener('focus', function(event) {
                          _this._textFieldLabel.style.display = 'none';
                      });
                      this._textField.addEventListener('blur', function(event) {
                          // Show only if no value in the text field
                          if (_this._textField.value.length === 0) _this._textFieldLabel.style.display = 'block';
                          // viizcom: when using script to change the value, call blur event to clear watermark
                          else _this._textFieldLabel.style.display = 'none';
                      });

                      // viizcom: set initial state
                      _this._textFieldLabel.style.display = _this._textField.value.length === 0 ? 'block' : 'none';
                  }
                  /** Underlined - adding/removing a focus class  */
                  if (this._type.indexOf(TextFieldConsts.Type.Underlined) >= 0) {
                      this._textField.addEventListener('focus', function(event) {
                          _this._container.classList.add('is-active');
                      });
                      this._textField.addEventListener('blur', function(event) {
                          _this._container.classList.remove('is-active');
                      });
                  }
              };
              return TextField;
          })();
          fabric.TextField = TextField;
      })(fabric || (fabric = {}));

      // Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information.
      ('use strict');
      var fabric;
      (function(fabric) {
      /**
       * Toggle Plugin
       *
       * Adds basic demonstration functionality to .vi-Toggle components.
       *
       */
          var Toggle = (function() {
              /**
         *
         * @param {HTMLElement} container - the target container for an instance of Toggle
         * @constructor
         */
              function Toggle(container) {
                  this._container = container;
                  this._toggleField = this._container.querySelector('.vi-Toggle-field');
                  this._addListeners();
              }
              Toggle.prototype.removeListeners = function() {
                  this._toggleField.removeEventListener('click', this._toggleHandler.bind(this));
              };
              Toggle.prototype._addListeners = function() {
                  var _this = this;
                  this._toggleField.addEventListener('click', this._toggleHandler.bind(this), false);
                  this._toggleField.addEventListener(
                      'keyup',
                      function(e) {
                          return e.keyCode === 32 ? _this._toggleHandler() : null;
                      },
                      false
                  );
              };
              Toggle.prototype._toggleHandler = function() {
                  this._toggleField.classList.toggle('is-selected');
              };
              return Toggle;
          })();
          fabric.Toggle = Toggle;
      })(fabric || (fabric = {}));
      // #endregion

      return fabric;
  })();
