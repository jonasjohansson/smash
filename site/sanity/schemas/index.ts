import type { SchemaTypeDefinition } from 'sanity';
import { caseStudyType } from './caseStudy';
import { labExperimentType } from './labExperiment';
import { creditType, mediaType, narrativeSectionType, socialLinkType } from './objects';
import { segmentType } from './segment';
import { siteSettingsType } from './siteSettings';

export const schemaTypes: SchemaTypeDefinition[] = [
  // documents
  caseStudyType,
  segmentType,
  labExperimentType,
  siteSettingsType,
  // objects
  mediaType,
  narrativeSectionType,
  creditType,
  socialLinkType,
];
