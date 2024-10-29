import { Component } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NgIf } from '@angular/common';
import {EditorConfig, NgxSimpleTextEditorModule, ST_BUTTONS} from 'ngx-simple-text-editor';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
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

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files![0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.imageUploaded = true;
        this.selectedFile = file;
      };
      reader.readAsDataURL(file);
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

      await this.http.post('http://localhost:8080/DescribeForClient', formData)
        .pipe(
          catchError(error => {
            console.error('Error occurred:', error);
            return throwError(error);
          })
        )
        .subscribe(response => {
          console.log("************************************* hello we in ************************************* ")
          console.log('API Response:', response);  // Log the response from the API
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
    <p>Price: ${response.price.replace('$', '')}</p>
    <p style="font-size: small; color: gray;">*Price may not be accurate.</p> <!-- Disclaimer for price -->
  `.trim(); // Remove any leading/trailing whitespace

    // Patch the values to the form
    this.productForm.patchValue({
      name: response.name,
      price: response.price.replace('$', ''), // Remove the dollar sign
      description: formattedData, // Set the formatted data to description
    });

    // Set the data to the CKEditor
    this.data = formattedData; // Assuming you have a 'data' property for the CKEditor
  }




  onSubmit(): void {
    if (this.productForm.valid) {
      console.log('Product Data:', this.productForm.value);
      alert('Product data submitted!');
      // Here you would send the form data to the backend
    }
  }
}
