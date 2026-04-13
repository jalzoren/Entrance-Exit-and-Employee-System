// xmlParser.js
export function parseVisitorConfig(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed');
    }
    
    // Parse fields
    const fields = [];
    const fieldNodes = xmlDoc.querySelectorAll('field');
    
    fieldNodes.forEach(fieldNode => {
      const field = {
        name: fieldNode.getAttribute('name'),
        type: fieldNode.getAttribute('type'),
        required: fieldNode.getAttribute('required') === 'true',
        label: fieldNode.querySelector('label')?.textContent || '',
        placeholder: fieldNode.querySelector('placeholder')?.textContent || '',
        errorMessage: fieldNode.querySelector('error-message')?.textContent || '',
      };
      
      if (field.type === 'select') {
        field.options = [];
        const optionNodes = fieldNode.querySelectorAll('option');
        optionNodes.forEach(optionNode => {
          field.options.push({
            value: optionNode.getAttribute('value'),
            label: optionNode.textContent
          });
        });
      }
      
      const dependsOn = fieldNode.getAttribute('depends-on');
      if (dependsOn) {
        field.dependsOn = dependsOn;
        field.dependsValue = fieldNode.getAttribute('depends-value');
      }
      
      fields.push(field);
    });
    
    // Parse modal config
    const modalConfig = {
      title: xmlDoc.querySelector('modal-config title')?.textContent || 'Visitor Form',
      instructions: {
        title: xmlDoc.querySelector('instructions title')?.textContent || '',
        text: xmlDoc.querySelector('instructions text')?.textContent || ''
      },
      hint: xmlDoc.querySelector('modal-config hint')?.textContent || ''
    };
    
    // Parse API config
    const endpointNode = xmlDoc.querySelector('endpoint');
    const apiConfig = {
      url: endpointNode?.getAttribute('url') || 'http://localhost:5000/api/visitor',
      method: endpointNode?.getAttribute('method') || 'POST',
      fieldMapping: {}
    };
    
    const mappingNodes = xmlDoc.querySelectorAll('map');
    mappingNodes.forEach(mapNode => {
      const formField = mapNode.getAttribute('form-field');
      const apiField = mapNode.getAttribute('api-field');
      if (formField && apiField) {
        apiConfig.fieldMapping[formField] = apiField;
      }
    });
    
    return { fields, modalConfig, apiConfig };
  }