import { ChangePassword, EditCompanyDetails } from '@/utils/schema'
import { Form, Formik } from 'formik'
import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import FormikField from '../shared/FormikField'
import { changePasswordService } from '@/services/Auth'
import { useRouter } from 'next/router'
import FullLoader from '../shared/FullLoader'
import Head from 'next/head'

const ChangePasswordPage = () => {

    const router = useRouter();
    const [loading, setloading] = useState(false)
    const {redirect_url} = router.query;
    
    

    const handleChangePassword = (values)=>{
        setloading(true)
        changePasswordService(values).then((response) => {
            setloading(false)
            toast.success(response.message, {
                position: "top-center",
            });	
           if(redirect_url){
            router.push(redirect_url)
           }
        })
        .catch((error) => {
            setloading(false)
            if (error.response?.status === 400) {					
            } else {
                toast.error(error.message, {
                    position: "top-center",
                });
            }
        });
    }
  return (
    <>
        <Head>
            <title>Workwise | Change Password</title>				
        </Head>
      <section className="buyer-common-header sc-pt-80 ">
            <div className="container-fluid">
                <h1 className="heading">Change Password</h1>
            </div>
        </section>
        
        <ToastContainer/>
        <section className="buyer-edit-sec-1 ">
        
            <div className="container-fluid ">
            
                <div className="row">
                    <div className="col-md-2"></div>
                    <div className="col-md-8 ">
                    
                        <div className="buyer-edit-sec-form hasFullLoader">
                        {loading &&<FullLoader/>}
                            <span className="title"></span>
                            <div className="contact-form">
                            <Formik
                                enableReinitialize={true}
                                initialValues={{
                                    password:"",
                                    confirm_password:""
                                }}
                                validationSchema={ChangePassword}
                                onSubmit={(values) => handleChangePassword(values)}
                            >
					            {({ errors, touched }) => (
						            <Form>
                                        <div className="row">
                                            <div className="col-md-12">
                                                <FormikField label="New Password" type="password" isRequired={true} name="password" touched={touched} errors={errors}/>
                                            </div>
                                            <div className="col-md-12">
                                                <FormikField label="Confirm Password" type="password" isRequired={true} name="confirm_password" touched={touched} errors={errors}/>
                                            </div>

                                           

                                            <button type="submit" className="btn btn-secondary">Change Password</button>
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>
    </>
  )
}

export default ChangePasswordPage
