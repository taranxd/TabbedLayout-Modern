import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IPropertyPaneConfiguration, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { escape, fromPairs } from '@microsoft/sp-lodash-subset';

import styles from './TabbedpageLayoutWebPart.module.scss';
import * as strings from 'TabbedpageLayoutWebPartStrings';
import { ITabs } from './ITabs';
import { ITabbedpageLayoutWebPartProps } from './ITabbedpageLayoutWebPartProps';
import { PropertyFieldCollectionData, CustomCollectionFieldType } from '@pnp/spfx-property-controls/lib/PropertyFieldCollectionData';

import * as jquery from 'jquery';
// import { fabric } from 'fabric';
import { SPComponentLoader } from '@microsoft/sp-loader';

declare var $;
declare var vifabric: any;

export default class TabbedpageLayoutWebPart extends BaseClientSideWebPart<ITabbedpageLayoutWebPartProps> {
  // private _parents: Map<string, Element>;
  // private _container: HTMLElement;
  protected onInit(): Promise<void> {
    // SPComponentLoader.loadCss('https://static2.sharepointonline.com/files/fabric/office-ui-fabric-js/1.4.0/css/fabric.min.css');
    // SPComponentLoader.loadCss('https://static2.sharepointonline.com/files/fabric/office-ui-fabric-js/1.4.0/css/fabric.components.min.css');
    require('./css/fabric.components.css');
    require('./css/Fabric.css');
    require('./JS/fabric.js');
    return super.onInit();
  }
  public render(): void {
    // this.domElement.innerHTML = `
    //   <div class="${styles.tabbedpageLayout}">
    //     <div class="${styles.container}">
    //       <div class="${styles.row}">
    //         <div class="${styles.column}">
    //           <span class="${styles.title}">Welcome to SharePoint!</span>
    //           <p class="${styles.subTitle}">Customize SharePoint experiences using Web Parts.</p>
    //           <p class="${styles.description}">${escape(this.properties.description)}</p>
    //           <a href="https://aka.ms/spfx" class="${styles.button}">
    //             <span class="${styles.label}">Learn more</span>
    //           </a>
    //         </div>
    //       </div>
    //     </div>
    //   </div>`;
    // require('office-fabric');
    //     this.domElement.innerHTML = `<div class="vi-Pivot">
    //   <ul class="vi-Pivot-links">
    //     <li class="vi-Pivot-link is-selected" data-content="files" title="My files" tabindex="1">
    //       My files
    //     </li>
    //     <li class="vi-Pivot-link " data-content="recent" title="Recent" tabindex="1">
    //       Recent
    //     </li>
    //     <li class="vi-Pivot-link " data-content="shared" title="Shared with me" tabindex="1">
    //       Shared with me
    //     </li>
    //     <li class="vi-Pivot-link" tabindex="1">
    //       <i class="vi-Pivot-ellipsis vi-Icon vi-Icon--More"></i>
    //     </li>
    //   </ul>
    //   <div class="vi-Pivot-content" data-content="files">
    //     This is the my files tab.
    //   </div>
    //   <div class="vi-Pivot-content" data-content="recent">
    //     This is the recent tab.
    //   </div>
    //   <div class="vi-Pivot-content" data-content="shared">
    //     This is the shared with me tab.
    //   </div>
    // </div>`;
    // this.initializeFabricUIPivots();
    console.log(this.properties);
    // this._parents = new Map<string, Element>();
    if (this.properties.tabs) {
      if (this.properties.tabs.length > 0) {
        let pivotHTML = document.createElement('div');
        // this._container = pivotHTML;
        pivotHTML.setAttribute('data-instanceId', this.instanceId);
        let pivotHeadDiv = document.createElement('div');
        let pivotUl = document.createElement('ul');
        pivotHeadDiv.setAttribute('class', 'vi-Pivot');
        pivotUl.setAttribute('class', 'vi-Pivot-links');
        if (!this.properties.showAsLinks) {
          // Show as Tabs
          //pivotHeadDiv.setAttribute('class', 'vi-Pivot--tabs');
          pivotHeadDiv.classList.add('vi-Pivot--tabs');
        }
        if (!this.properties.normalSize) {
          // pivotHeadDiv.setAttribute('class', 'vi-Pivot--large');
          pivotHeadDiv.classList.add('vi-Pivot--large');
        }
        this.properties.tabs.forEach(tab => {
          let pivotItemli = document.createElement('li');
          pivotItemli.setAttribute('class', 'vi-Pivot-link');
          pivotItemli.setAttribute('title', tab.name);
          pivotItemli.setAttribute('data-content', tab.sectionId);
          // pivotItemli.setAttribute('data-htSectionId', tab.sectionId);
          pivotItemli.innerHTML = tab.name;
          pivotUl.appendChild(pivotItemli);
        });

        pivotHeadDiv.appendChild(pivotUl);

        //Move Webparts
        this.properties.tabs.forEach(tab => {
          let pivotContentDiv = document.createElement('div');
          pivotContentDiv.setAttribute('class', 'vi-Pivot-content');
          pivotContentDiv.setAttribute('data-content', tab.sectionId);
          const source = document.querySelector(`[data-sp-a11y-id="${tab.sectionId}"]`);
          if (source) {
            pivotContentDiv.appendChild(source);
            pivotHeadDiv.appendChild(pivotContentDiv);
            // this._parents.set(tab.sectionId, source.parentElement);
          }
        });
        pivotHTML.appendChild(pivotHeadDiv);
        this.domElement.innerHTML = '';
        this.domElement.appendChild(pivotHTML);
        // = pivotHTML;
        // this.domElement.innerHTML = pivotHTML.innerHTML;
        this.initializeFabricUIPivots();
      } else {
        this.domElement.innerHTML = '<div>There are no Webparts</div>';
      }
    } else {
      this.domElement.innerHTML = '<div>Configure the webpart</div>';
    }
  }
  // private moveSections(): void {
  //   this._parents = new Map<string, Element>();
  //   this.props.tabs.forEach((tab: IHipsterTab) => {
  //     const source = document.querySelector(`[data-sp-a11y-id="${tab.sectionId}"]`);
  //     const dest = this._container.querySelector(`[data-htSectionId="${tab.sectionId}"]`);
  //     if (source && dest) {
  //       this._parents.set(tab.sectionId, source.parentElement);
  //       dest.appendChild(source);
  //     }
  //   });
  // }

  // private restoreSections(): void {
  // this._parents.forEach((parent: Element, sectionId: string) => {
  // const tabContent = this._container.querySelector(`[data-htSectionId="${sectionId}"]`).firstElementChild;
  // if (parent && tabContent) {
  // parent.appendChild(tabContent);
  // }
  // });
  // }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: any, newValue: any): void {
    console.log(`this is old Value objecy ${oldValue}`);
    console.log(`this is new value object ${newValue}`);
    if (propertyPath == 'tabs') {
      // Get Unique tab names
      const tabNames = new Array<string>();
      this.properties.tabs.forEach((tab: ITabs) => {
        if (tabNames.indexOf(tab.name) == -1) {
          tabNames.push(tab.name);
        }
      });

      // Group entries by tab name (preserving the order)
      // also removes duplicate section entries
      const groupedTabs = new Array<ITabs>();
      const assignedSections = new Array<string>();
      tabNames.forEach((name: string) => {
        groupedTabs.push(
          ...this.properties.tabs.filter((tab: ITabs) => {
            if (tab.name == name) {
              if (assignedSections.indexOf(tab.sectionId) == -1) {
                assignedSections.push(tab.sectionId);
                return true;
              }
            }
            return false;
          })
        );
      });

      this.properties.tabs = groupedTabs;
    }
  }

  private getZones(): Array<[string, string]> {
    const zones = new Array<[string, string]>();

    // const zoneElements: NodeListOf<HTMLElement> = <NodeListOf<HTMLElement>>document.querySelectorAll('.CanvasZoneContainer > .CanvasZone');
    const zoneElements: NodeListOf<HTMLElement> = <NodeListOf<HTMLElement>>document.querySelectorAll('.CanvasZone');

    for (let z = 0; z < zoneElements.length; z++) {
      // disqualify the zone containing this webpart
      if (zoneElements[z].querySelector('.ControlZone')) {
        if (!zoneElements[z].querySelector('.ControlZone').querySelector(`[data-instanceId="${this.instanceId}"]`)) {
          const zoneId = zoneElements[z].dataset.spA11yId;
          const sectionCount = zoneElements[z].getElementsByClassName('CanvasSection').length;
          let zoneName: string = `${strings.PropertyPane_SectionName_Section} ${z + 1} (${sectionCount} ${
            sectionCount == 1 ? strings.PropertyPane_SectionName_Column : strings.PropertyPane_SectionName_Columns
          })`;
          zones.push([zoneId, zoneName]);
        }
      }
    }
    return zones;
  }

  private initializeFabricUIPivots() {
    var PivotElements = document.querySelectorAll('.vi-Pivot');
    for (var i = 0; i < PivotElements.length; i++) {
      // tslint:disable-next-line:no-unused-expression
      new vifabric['Pivot'](PivotElements[i]);
    }
  }
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          groups: [
            {
              groupFields: [
                PropertyFieldCollectionData('tabs', {
                  key: 'tabs',
                  label: strings.PropertyPane_TabsLabel,
                  panelHeader: strings.PropertyPane_TabsHeader,
                  manageBtnLabel: strings.PropertyPane_TabsButtonLabel,
                  value: this.properties.tabs,

                  fields: [
                    {
                      id: 'name',
                      title: strings.PropertyPane_TabsField_Name,
                      type: CustomCollectionFieldType.string,
                      required: true
                    },
                    {
                      id: 'sectionId',
                      title: strings.PropertyPane_TabsField_Section,
                      type: CustomCollectionFieldType.dropdown,
                      required: true,
                      options: this.getZones().map((zone: [string, string]) => {
                        return {
                          key: zone['0'],
                          text: zone['1']
                        };
                      })
                    }
                  ]
                }),
                PropertyPaneToggle('showAsLinks', {
                  label: strings.PropertyPane_LinksLabel,
                  checked: this.properties.showAsLinks,
                  onText: strings.PropertyPane_LinksOnLabel,
                  offText: strings.PropertyPane_LinksOffLabel
                }),
                PropertyPaneToggle('normalSize', {
                  label: strings.PropertyPane_SizeLabel,
                  checked: this.properties.normalSize,
                  onText: strings.PropertyPane_SizeOnLabel,
                  offText: strings.PropertyPane_SizeOffLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
