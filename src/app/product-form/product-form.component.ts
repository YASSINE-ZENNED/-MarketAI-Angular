import { Component } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NgIf } from '@angular/common';
import {EditorConfig, NgxSimpleTextEditorModule, ST_BUTTONS} from 'ngx-simple-text-editor';

import {ChangeEvent, CKEditorModule} from '@ckeditor/ckeditor5-angular';
import {
  ClassicEditor,
  Bold,
  Essentials,
  Heading,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  MediaEmbed,
  Paragraph,
  Table,
  Undo
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';


@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [HttpClientModule, FormsModule, ReactiveFormsModule, NgIf, NgxSimpleTextEditorModule,CKEditorModule ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent {
  retrieveddata: string = "";

  productForm: FormGroup;
  imagePreview: string | ArrayBuffer | null = null;
  imageUploaded = false;
  formVisible = false;
  keywords = '';
  selectedFile: File | null = null;
  myGroup: FormGroup ;
  data="it works";
  content = '';
  config1: EditorConfig = {
    placeholder: 'Type something...',
    buttons: ST_BUTTONS,
  };
  disc:any;
  ImageURL:string | undefined;
  public Editor = ClassicEditor;
  public config = {
    toolbar: [
      'undo', 'redo', '|',
      'heading', '|', 'bold', 'italic', '|',
      'link',  'mediaEmbed', '|',
      'bulletedList', 'numberedList', 'indent', 'outdent'
    ],
    plugins: [
      Bold,
      Essentials,
      Heading,
      Indent,
      IndentBlock,
      Italic,
      Link,
      List,
      Undo
    ]
  }

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.myGroup = new FormGroup({
      content: new FormControl(this.content),
    });

    this.productForm = this.fb.group({
      name: ['', Validators.required],
      keyFeatures: ['', Validators.required],
      price: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      description: ['', Validators.required],
    });
  }
  public onChange({ editor }: ChangeEvent) {
    const data = editor.getData();
    this.retrieveddata=data;
  }

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      this.selectedFile = file; // Save the file for upload purposes

      // Read the image file and create a preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result; // Set the image preview
        this.imageUploaded = true; // Mark image as uploaded to show the preview
      };
      reader.readAsDataURL(file); // Convert to data URL
    }
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      const file = event.dataTransfer.files[0];
      this.onFileSelected({ target: { files: [file] } } as any);
    }
  }

  async onGenerate(): Promise<void> {
    console.log('Keywords:', this.keywords);

    if ( this.selectedFile) {
      const formData = new FormData();
      formData.append('image', this.selectedFile);
      formData.append('keywords', this.keywords);

      const uploadFormData = new FormData();
      uploadFormData.append('file', this.selectedFile);
      const uploadResponse = await this.http.post('http://localhost:8080/S3/upload', uploadFormData, { responseType: 'text' }).toPromise();
      this.ImageURL=uploadResponse;
      console.log('File Upload Response:', uploadResponse);


       this.http.post('http://localhost:8080/DescribeForClient', formData)
        .pipe(
          catchError(error => {
            console.error('Error occurred:', error);
            return throwError(error);
          })
        )
        .subscribe(response => {
          console.log("************************************* hello we in ************************************* ")
          console.log('API Response:', response);  // Log the response from the API
          this.disc=response;

          this.populateForm(response);  // Populate the form with response data
          this.formVisible = true;  // Show the form when the response is received
        });

    } else {
      alert('Please enter some keywords and upload an image.');
    }
  }


  populateForm(response: any): void {
    // Create a bulleted list for key features
    const keyFeaturesList = response.KeyFeatures.map((feature: any) => `<li>${feature}</li>`).join('');

    // Create the formatted data with line breaks
    const formattedData = `
    <h1>${response.name}</h1>
    <p>${response.description}</p>
    <h2>Key Features:</h2>
    <ul>${keyFeaturesList}</ul>
    <p>Condition:${response.isNew ? "New" : "Used"}</p>

    <p>Price: ${response.price.replace('$', '')}</p>
  `.trim(); // Remove any leading/trailing whitespace

    // Patch the values to the form
    this.productForm.patchValue({
      name: response.name,
      price: response.price.replace('$', ''), // Remove the dollar sign
      description: formattedData, // Set the formatted data to description
    });

    this.retrieveddata=formattedData;
    this.data = formattedData; // Assuming you have a 'data' property for the CKEditor
  }


  formatItemDetails(item: any): string {
    return `Name:\n${item.name || "N/A"}\n\n` +
      `Description:\n${item.description || "N/A"}\n\n` +
      `Key Features:\n${item.KeyFeatures && item.KeyFeatures.length > 0 ?
        "- " + item.KeyFeatures.join("\n- ") : "No key features available"}\n\n` +
      `Condition:\n${item.isNew ? "New" : "Used"}\n\n` +
      `Price:\n${item.price || "N/A"}`;
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      console.log('Product Data:', this.productForm.value);
      alert('Product data submitted!');
      // Here you would send the form data to the backend
    }
  }
   stripHtml = (text: string): string => text.replace(/<\/?[^>]+(>|$)/g, "").trim();

  async  onPost() {
    // Encode the parameters for use in a URL
    console.log("//////////////////////////////////////////////")
    // Assuming 'tempDiv' is created and 'this.retrieveddata' contains the HTML string
    console.log(this.retrieveddata);

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = this.retrieveddata;

// Extract each section based on tag structure
    // @ts-ignore
    const name = tempDiv.querySelector("h1")?.textContent.trim() || "N/A";

// Extract the description from the first <p> element
    // @ts-ignore
    const description = tempDiv.querySelector("p")?.textContent.trim() || "N/A";

// Extract key features from the <ul> list items
    // @ts-ignore
    const keyFeaturesList = Array.from(tempDiv.querySelectorAll("ul li")).map(li => li.textContent.trim());

// Extract condition using regex
    const conditionMatch = this.retrieveddata.match(/Condition:\s*(\w+)/i);
    const condition = conditionMatch ? conditionMatch[1].trim() : "N/A";

// Extract price using regex
    const priceMatch = this.retrieveddata.match(/Price:\s*([^\s<]+)/i);  // Match until whitespace or HTML tag
    const price = priceMatch ? priceMatch[1].trim() : "N/A";

// Format the extracted data
    const formattedData = `
Name: ${name}

Description: ${description}

Key Features:
- ${keyFeaturesList.join("\n- ")}

Condition: ${condition}

Price: ${price}
`;

// Output the formatted data


// Output the formatted data
    console.log(formattedData);
    console.log("*****************************************")

    console.log("//////////////////////////////////////////////")

    const imageUrl = this.ImageURL;

    // Construct the full URL with query parameters
    const url = `https://mrp.app.n8n.cloud/webhook-test/232db240-e4b5-480d-9ab5-e33c00e1991c?Name=${name}&description=${description}&keyfeatures=${keyFeaturesList}&condition=${condition}&price=${price}&imageUrl=${imageUrl}`;

    try {
      // Make the GET request with the parameters in the URL
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("//////////////////////////////////////////////")

      // Check for success
      if (response.ok) {
        const result = await response.json();
        console.log("Response from server:", result);
      } else {
        console.error("Failed to send data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error during fetch:", error);
    }
  }


}
