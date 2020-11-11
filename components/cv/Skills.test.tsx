import React from 'react';
import { shallow } from 'enzyme';
import { expect } from 'chai';
import Skills from './Skills';
import { CurriculumVitae } from '../../types/domain';

describe('Skills', () => {
  const testDescription = 'test description';
  const skillCategories: CurriculumVitae.SkillsListCategory[] = [];

  it('should render a description', () => {
    const wrapper = shallow(<Skills skillsDescription={testDescription} skillsCategories={skillCategories} />);
    expect(wrapper.text()).to.include(testDescription);
  });

  it('should pass skillCategories to the skill list', () => {
    const wrapper = shallow(<Skills skillsDescription={testDescription} skillsCategories={skillCategories} />);
    expect(wrapper.find('SkillsList').prop('skillsCategories')).to.equal(skillCategories); // Exact object
  });
});
