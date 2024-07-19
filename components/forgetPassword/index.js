import { ChangePassword, EditCompanyDetails, ForgetPassword, ForgetPasswordOtpValidation } from '@/utils/schema'
import { Form, Formik } from 'formik'
import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import FormikField from '../shared/FormikField'
import { changePasswordService, forgetPasswordService, forgetPasswordValiationService } from '@/services/Auth'
import { useRouter } from 'next/router'
import FullLoader from '../shared/FullLoader'
import Head from 'next/head'

const ForgetPasswordPage = () => {

    const router = useRouter();
    const [loading, setloading] = useState(false)
    const [optSentSuccess, setoptSentSuccess] = useState(false)
    const {otp} = router.query;
    
    

    const hangleForgetPassword = (values)=>{
        setloading(true)
        forgetPasswordService(values).then((response) => {
            setloading(false)
            toast.success(response.message, {
                position: "top-center",
            });	
            //router.push("/validate-otp?otp=000000")
            setoptSentSuccess(true)
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

    const hangleForgetPasswordValidataion = (values)=>{
        setloading(true)
        forgetPasswordValiationService(values).then((response) => {
            setloading(false)
            toast.success(response.message, {
                position: "top-center",
            });	
            router.push("/")
           
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
            <title>Workwise | Forget Password</title>				
        </Head>
      <section className="buyer-common-header sc-pt-80 ">
            <div className="container-fluid">
                <h1 className="heading">Forget Password</h1>
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
                            {optSentSuccess &&<h4 className="text-center mb-0">Please check your email!</h4>}
                            {!optSentSuccess &&<div className="contact-form">
                                {otp ? (
                                    <Formik
                                        enableReinitialize={true}
                                        initialValues={{
                                            otp:otp?otp:"",
                                            password:"",
                                            confirm_password:""
                                        }}
                                        validationSchema={ForgetPasswordOtpValidation}
                                        onSubmit={(values) => hangleForgetPasswordValidataion(values)}
                                    >
                                        {({ errors, touched }) => (
                                            <Form>
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <FormikField label="OTP" type="number" isRequired={true} name="otp" touched={touched} errors={errors}/>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <FormikField label="New Password" type="password" isRequired={true} name="password" touched={touched} errors={errors}/>
                                                    </div>
                                                    <div className="col-md-12">
                                                        <FormikField label="Confirm Password" type="password" isRequired={true} name="confirm_password" touched={touched} errors={errors}/>
                                                    </div>
                                                    
        
                                                    <button type="submit" className="btn btn-secondary">{otp?"Change Password":"Get OTP"}</button>
                                                </div>
                                            </Form>
                                        )}
                                    </Formik>
                                ):
                                <Formik
                                    enableReinitialize={true}
                                    initialValues={{
                                        email:"",
                                    }}
                                    validationSchema={ForgetPassword}
                                    onSubmit={(values) => hangleForgetPassword(values)}
                                >
                                    {({ errors, touched }) => (
                                        <Form>
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <FormikField label="Email" type="email" isRequired={true} name="email" touched={touched} errors={errors}/>
                                                </div>

                                                <button type="submit" className="btn btn-secondary">{otp?"Change Password": "Get OTP"}</button>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                                }
                            </div>}
                        </div>
                    </div>
                </div>
                
            </div>
        </section>
    </>
  )
}

export default ForgetPasswordPage
