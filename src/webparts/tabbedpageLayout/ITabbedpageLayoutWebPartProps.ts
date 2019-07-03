import { ITabs } from './ITabs';
export interface ITabbedpageLayoutWebPartProps {
  description: string;
  title: string;
  showAsLinks: boolean;
  normalSize: boolean;
  tabs: Array<ITabs>;
}
