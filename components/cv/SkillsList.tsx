import React from 'react';
import styled from 'styled-components';
import { CurriculumVitae } from '../../types/domain';

export type SkillsListProps = {
  skillsCategories: CurriculumVitae.SkillsListCategory[];
};

const SkillsListList = styled.dl`
  dl {
    display: grid;
    grid-template-columns: max-content auto;
    padding: 1rem 0 0;
  }

  dt {
    font-weight: 700;
    padding: 0 0.5rem 0 0;
  }
`;
SkillsListList.displayName = 'SkillsListList';

const SkillsList = ({ skillsCategories }: SkillsListProps): JSX.Element => (
  <SkillsListList>
    {skillsCategories.map(({ category, skills }) => (
      <React.Fragment key={category}>
        <dt>{category}</dt>
        <dd>{skills.join(', ')}</dd>
      </React.Fragment>
    ))}
  </SkillsListList>
);

export default SkillsList;
